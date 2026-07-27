import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyScope,
    getActiveRequesterProfileById,
    isAdmin
} from '@/lib/api-auth';
import {
    canManageMetaIntegration,
    exchangeMetaCode,
    upsertMetaPagesAndForms
} from '@/lib/meta-leads';
import { fetchMetaOAuthDiagnostics } from '@/lib/meta-oauth-diagnostics';
import {
    META_OAUTH_NONCE_COOKIE,
    META_OAUTH_STATE_COOKIE,
    parseMetaOAuthCallbackState,
    type MetaOAuthState
} from '@/lib/meta-oauth-state';

export const dynamic = 'force-dynamic';

function getAppUrl(request: Request) {
    return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

function buildRedirectUrl(request: Request, path: MetaOAuthState['redirectPath'] | undefined, params: Record<string, string>) {
    const safePath = path?.startsWith('/') ? path : '/dashboard/franchise-leads';
    const url = new URL(safePath, getAppUrl(request));
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
}

export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const errorReason = searchParams.get('error_reason') || searchParams.get('error');
    const cookieStore = await cookies();
    const state = parseMetaOAuthCallbackState(
        searchParams.get('state'),
        cookieStore.get(META_OAUTH_STATE_COOKIE)?.value || null,
        cookieStore.get(META_OAUTH_NONCE_COOKIE)?.value || null
    );
    const clearOAuthCookies = () => {
        cookieStore.delete(META_OAUTH_NONCE_COOKIE);
        cookieStore.delete(META_OAUTH_STATE_COOKIE);
    };

    if (errorReason) {
        clearOAuthCookies();
        return NextResponse.redirect(buildRedirectUrl(request, state?.redirectPath, {
            meta: 'error',
            reason: errorReason
        }));
    }
    if (!code || !state) {
        clearOAuthCookies();
        return NextResponse.redirect(buildRedirectUrl(request, state?.redirectPath, {
            meta: 'error',
            reason: 'invalid_state'
        }));
    }

    try {
        const requesterProfile = await getActiveRequesterProfileById(supabaseAdmin, state.requesterId);
        if (!requesterProfile || !canManageMetaIntegration(requesterProfile)) {
            clearOAuthCookies();
            return NextResponse.redirect(buildRedirectUrl(request, state.redirectPath, {
                meta: 'error',
                reason: 'forbidden'
            }));
        }

        if (!isAdmin(requesterProfile) && !canAccessCompanyScope(requesterProfile, state.companyId)) {
            clearOAuthCookies();
            return NextResponse.redirect(buildRedirectUrl(request, state.redirectPath, {
                meta: 'error',
                reason: 'company_scope'
            }));
        }

        const redirectUri = `${getAppUrl(request)}/api/integrations/meta/callback`;
        const token = await exchangeMetaCode(code, redirectUri);
        const result = await upsertMetaPagesAndForms(supabaseAdmin, {
            companyId: state.companyId,
            connectedBy: requesterProfile.id,
            userAccessToken: token.access_token
        });
        const oauthDiagnostics = result.connections.length === 0
            ? await fetchMetaOAuthDiagnostics(token.access_token)
            : null;
        console.info('Meta OAuth callback sync completed:', JSON.stringify({
            companyId: state.companyId,
            requesterId: requesterProfile.id,
            discoveredPageCount: result.pageDiagnostics.length,
            pageDiagnostics: result.pageDiagnostics,
            savedConnectionCount: result.connections.length,
            savedFormCount: result.forms.length,
            oauthDiagnostics
        }));

        clearOAuthCookies();
        return NextResponse.redirect(buildRedirectUrl(request, state.redirectPath, {
            meta: 'connected',
            pages: String(result.connections.length),
            forms: String(result.forms.length)
        }));
    } catch (error) {
        clearOAuthCookies();
        console.error('Meta OAuth callback error:', error);
        return NextResponse.redirect(buildRedirectUrl(request, state.redirectPath, {
            meta: 'error',
            reason: error instanceof Error ? error.message.slice(0, 80) : 'callback_failed'
        }));
    }
}
