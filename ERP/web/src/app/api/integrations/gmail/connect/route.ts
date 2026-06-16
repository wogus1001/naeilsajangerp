import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName
} from '@/lib/api-auth';
import { isGmailConfigured } from '@/lib/gmail-integration';
import {
    buildGmailAuthUrl,
    getGmailRedirectUriFromRequest
} from '@/lib/gmail-provider';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function encodeState(value: Record<string, string>) {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
    if (!requesterProfile) {
        return NextResponse.json({ error: 'requesterId is required' }, { status: 401 });
    }
    if (!isGmailConfigured()) {
        return NextResponse.json({ error: 'Gmail OAuth environment is not configured' }, { status: 424 });
    }

    const companyName = searchParams.get('company');
    const requestedCompanyId = companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null;
    const companyId = requestedCompanyId || requesterProfile.company_id;
    if (!companyId) {
        return NextResponse.json({ error: 'Company scope is required' }, { status: 400 });
    }
    if (!isAdmin(requesterProfile) && !canAccessCompanyScope(requesterProfile, companyId)) {
        return NextResponse.json({ error: 'Forbidden: cross-company connect denied' }, { status: 403 });
    }

    const nonce = randomUUID();
    const redirectPath = searchParams.get('redirect') || '/dashboard/franchise-leads';
    const state = encodeState({
        nonce,
        requesterId: requesterProfile.id,
        companyId,
        redirectPath: redirectPath.startsWith('/') ? redirectPath : '/dashboard/franchise-leads'
    });

    const cookieStore = await cookies();
    cookieStore.set('gmail_oauth_nonce', nonce, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10
    });

    return NextResponse.redirect(buildGmailAuthUrl({
        redirectUri: getGmailRedirectUriFromRequest(request),
        state
    }));
}
