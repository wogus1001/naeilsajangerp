import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin
} from '@/lib/api-auth';
import {
    canManageMetaIntegration,
    exchangeMetaCode,
    upsertMetaPagesAndForms
} from '@/lib/meta-leads';

export const dynamic = 'force-dynamic';

type MetaOAuthState = {
    nonce?: string;
    requesterId?: string;
    companyId?: string;
    redirectPath?: string;
};

function getAppUrl(request: Request) {
    return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

function decodeState(value: string | null): MetaOAuthState | null {
    if (!value) return null;
    try {
        return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as MetaOAuthState;
    } catch {
        return null;
    }
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
    const state = decodeState(searchParams.get('state'));
    const errorReason = searchParams.get('error_reason') || searchParams.get('error');
    const cookieStore = await cookies();
    const nonceCookie = cookieStore.get('meta_oauth_nonce')?.value;

    if (errorReason) {
        return NextResponse.redirect(buildRedirectUrl(request, state?.redirectPath, {
            meta: 'error',
            reason: errorReason
        }));
    }
    if (!code || !state?.requesterId || !state.companyId || !state.nonce || state.nonce !== nonceCookie) {
        return NextResponse.redirect(buildRedirectUrl(request, state?.redirectPath, {
            meta: 'error',
            reason: 'invalid_state'
        }));
    }

    try {
        const requesterProfile = await getRequesterProfile(supabaseAdmin, request, state.requesterId);
        if (!requesterProfile || !canManageMetaIntegration(requesterProfile)) {
            return NextResponse.redirect(buildRedirectUrl(request, state.redirectPath, {
                meta: 'error',
                reason: 'forbidden'
            }));
        }

        if (!isAdmin(requesterProfile) && !canAccessCompanyScope(requesterProfile, state.companyId)) {
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

        cookieStore.delete('meta_oauth_nonce');
        return NextResponse.redirect(buildRedirectUrl(request, state.redirectPath, {
            meta: 'connected',
            pages: String(result.connections.length),
            forms: String(result.forms.length)
        }));
    } catch (error) {
        console.error('Meta OAuth callback error:', error);
        return NextResponse.redirect(buildRedirectUrl(request, state?.redirectPath, {
            meta: 'error',
            reason: error instanceof Error ? error.message.slice(0, 80) : 'callback_failed'
        }));
    }
}
