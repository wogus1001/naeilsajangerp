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
import {
    encodeMetaOAuthState,
    META_OAUTH_NONCE_COOKIE,
    META_OAUTH_STATE_COOKIE
} from '@/lib/meta-oauth-state';
import { buildMetaOAuthAuthorizeUrl } from '@/lib/meta-oauth-authorize-url';

export const dynamic = 'force-dynamic';

function getAppUrl(request: Request) {
    return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
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
    const state = encodeMetaOAuthState({
        nonce,
        requesterId: requesterProfile.id,
        companyId,
        redirectPath
    });

    const cookieStore = await cookies();
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10
    } as const;
    cookieStore.set(META_OAUTH_NONCE_COOKIE, nonce, cookieOptions);
    cookieStore.set(META_OAUTH_STATE_COOKIE, state, cookieOptions);

    const authUrl = buildMetaOAuthAuthorizeUrl({
        appId,
        redirectUri,
        state,
        graphVersion: process.env.META_GRAPH_API_VERSION || 'v25.0',
        businessLoginConfigId: process.env.META_BUSINESS_LOGIN_CONFIG_ID
    });

    if (searchParams.get('response') === 'json') {
        return NextResponse.json({ authorizationUrl: authUrl.toString() });
    }
    return NextResponse.redirect(authUrl);
}
