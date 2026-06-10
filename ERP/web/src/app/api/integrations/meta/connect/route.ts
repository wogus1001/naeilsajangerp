import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName
} from '@/lib/api-auth';
import { canManageMetaIntegration } from '@/lib/meta-leads';

export const dynamic = 'force-dynamic';

function getAppUrl(request: Request) {
    return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

function encodeState(value: Record<string, unknown>) {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const requesterProfile = await getRequesterProfile(supabaseAdmin, request);

    if (!requesterProfile) {
        return NextResponse.json({ error: 'requesterId is required' }, { status: 401 });
    }
    if (!canManageMetaIntegration(requesterProfile)) {
        return NextResponse.json({ error: 'Only managers can connect Meta accounts' }, { status: 403 });
    }

    const appId = process.env.META_APP_ID;
    if (!appId || !process.env.META_APP_SECRET) {
        return NextResponse.json({ error: 'Meta app environment is not configured' }, { status: 500 });
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

    const nonce = crypto.randomUUID();
    const redirectPath = searchParams.get('redirect') || '/dashboard/franchise-leads';
    const redirectUri = `${getAppUrl(request)}/api/integrations/meta/callback`;
    const state = encodeState({
        nonce,
        requesterId: requesterProfile.id,
        companyId,
        redirectPath
    });

    const cookieStore = await cookies();
    cookieStore.set('meta_oauth_nonce', nonce, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10
    });

    const authUrl = new URL(`https://www.facebook.com/${process.env.META_GRAPH_API_VERSION || 'v25.0'}/dialog/oauth`);
    authUrl.searchParams.set('client_id', appId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('auth_type', 'rerequest');
    authUrl.searchParams.set('scope', [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'leads_retrieval'
    ].join(','));

    return NextResponse.redirect(authUrl);
}
