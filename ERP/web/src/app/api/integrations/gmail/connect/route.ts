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
import {
    encodeGmailOAuthState,
    GMAIL_OAUTH_NONCE_COOKIE,
    GMAIL_OAUTH_STATE_COOKIE
} from '@/lib/gmail-oauth-state';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const requesterProfile = await getRequesterProfile(supabaseAdmin, request);
    if (!requesterProfile) {
        return NextResponse.json({ error: '로그인 인증이 필요합니다.' }, { status: 401 });
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
    const state = encodeGmailOAuthState({
        nonce,
        requesterId: requesterProfile.id,
        companyId,
        redirectPath: redirectPath.startsWith('/') ? redirectPath : '/dashboard/franchise-leads',
        completionMode: searchParams.get('flow') === 'popup' ? 'popup' : 'redirect',
        openerOrigin: new URL(request.url).origin
    });

    const cookieStore = await cookies();
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10
    } as const;
    cookieStore.set(GMAIL_OAUTH_NONCE_COOKIE, nonce, cookieOptions);
    cookieStore.set(GMAIL_OAUTH_STATE_COOKIE, state, cookieOptions);

    const authorizationUrl = buildGmailAuthUrl({
        redirectUri: getGmailRedirectUriFromRequest(request),
        state
    }).toString();

    if (searchParams.get('response') === 'json') {
        return NextResponse.json({ authorizationUrl });
    }
    return NextResponse.redirect(authorizationUrl);
}
