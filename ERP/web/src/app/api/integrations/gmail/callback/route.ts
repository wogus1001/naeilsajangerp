import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
    canAccessCompanyScope,
    getActiveRequesterProfileById,
    isAdmin
} from '@/lib/api-auth';
import {
    encryptGmailToken,
    GmailIntegrationError
} from '@/lib/gmail-integration';
import {
    exchangeGmailCode,
    fetchGmailUserEmail,
    getGmailRedirectUriFromRequest
} from '@/lib/gmail-provider';
import {
    GMAIL_OAUTH_NONCE_COOKIE,
    GMAIL_OAUTH_STATE_COOKIE,
    parseGmailOAuthCallbackState
} from '@/lib/gmail-oauth-state';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type ExistingConnection = {
    readonly encrypted_refresh_token: string | null;
};

function getAppUrl(request: Request) {
    return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

function buildRedirectUrl(request: Request, path: string | undefined, params: Record<string, string>) {
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
    const state = parseGmailOAuthCallbackState(
        searchParams.get('state'),
        cookieStore.get(GMAIL_OAUTH_STATE_COOKIE)?.value || null,
        cookieStore.get(GMAIL_OAUTH_NONCE_COOKIE)?.value || null
    );

    const clearOAuthCookies = () => {
        cookieStore.delete(GMAIL_OAUTH_NONCE_COOKIE);
        cookieStore.delete(GMAIL_OAUTH_STATE_COOKIE);
    };

    if (errorReason) {
        clearOAuthCookies();
        return NextResponse.redirect(buildRedirectUrl(request, state?.redirectPath, {
            gmail: 'error',
            reason: errorReason
        }));
    }
    if (!code || !state) {
        clearOAuthCookies();
        return NextResponse.redirect(buildRedirectUrl(request, state?.redirectPath, {
            gmail: 'error',
            reason: 'invalid_state'
        }));
    }

    try {
        const requesterProfile = await getActiveRequesterProfileById(supabaseAdmin, state.requesterId);
        if (!requesterProfile) {
            clearOAuthCookies();
            return NextResponse.redirect(buildRedirectUrl(request, state.redirectPath, {
                gmail: 'error',
                reason: 'auth_required'
            }));
        }
        if (!isAdmin(requesterProfile) && !canAccessCompanyScope(requesterProfile, state.companyId)) {
            clearOAuthCookies();
            return NextResponse.redirect(buildRedirectUrl(request, state.redirectPath, {
                gmail: 'error',
                reason: 'company_scope'
            }));
        }

        const token = await exchangeGmailCode(code, getGmailRedirectUriFromRequest(request));
        const gmailEmail = await fetchGmailUserEmail(token.accessToken);
        const { data: existing } = await supabaseAdmin
            .from('profile_gmail_connections')
            .select('encrypted_refresh_token')
            .eq('profile_id', requesterProfile.id)
            .eq('company_id', state.companyId)
            .maybeSingle();
        const existingConnection = existing as ExistingConnection | null;
        const refreshToken = token.refreshToken
            ? encryptGmailToken(token.refreshToken)
            : existingConnection?.encrypted_refresh_token || null;

        const { error } = await supabaseAdmin
            .from('profile_gmail_connections')
            .upsert({
                profile_id: requesterProfile.id,
                company_id: state.companyId,
                gmail_email: gmailEmail,
                encrypted_access_token: encryptGmailToken(token.accessToken),
                encrypted_refresh_token: refreshToken,
                token_expires_at: token.expiresAt,
                scope: token.scope,
                status: 'active',
                updated_at: new Date().toISOString()
            }, { onConflict: 'profile_id,company_id' });
        if (error) throw error;

        clearOAuthCookies();
        return NextResponse.redirect(buildRedirectUrl(request, state.redirectPath, {
            gmail: 'connected',
            email: gmailEmail
        }));
    } catch (error) {
        clearOAuthCookies();
        console.error('Gmail OAuth callback error:', error);
        const reason = error instanceof GmailIntegrationError || error instanceof Error
            ? error.message.slice(0, 80)
            : 'callback_failed';
        return NextResponse.redirect(buildRedirectUrl(request, state?.redirectPath, {
            gmail: 'error',
            reason
        }));
    }
}
