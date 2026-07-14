import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isMatchingUcansignState, readUcansignReturnPath } from '@/lib/ucansign/route-auth';
import { extractTokenExpiresInMs } from '@/lib/ucansign/platform-response';

const DEFAULT_TOKEN_EXPIRES_MS = 30 * 60 * 1000;

type TokenResult = {
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly expiresIn?: unknown;
    readonly expires_in?: unknown;
    readonly expires?: unknown;
    readonly expiresAt?: unknown;
};

function tokenResult(value: unknown): TokenResult | null {
    if (typeof value !== 'object' || value === null) return null;
    const response = value as Record<string, unknown>;
    const result = typeof response.result === 'object' && response.result !== null
        ? response.result as Record<string, unknown>
        : null;
    if (typeof response.msg !== 'string' || response.msg.toLowerCase() !== 'success' || !result) return null;
    if (typeof result.accessToken !== 'string' || typeof result.refreshToken !== 'string') return null;
    return result as TokenResult;
}

// Service Role Client
// Service Role Client
// Removed top level

export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    const cookieStore = await cookies();
    const userId = cookieStore.get('ucansign_pending_user')?.value;
    const expectedState = cookieStore.get('ucansign_oauth_state')?.value || null;
    cookieStore.delete('ucansign_pending_user');
    cookieStore.delete('ucansign_oauth_state');

    if (!userId) {
        return NextResponse.json({ error: 'Session expired or invalid user' }, { status: 400 });
    }
    if (!code) {
        return NextResponse.json({ error: 'Authorization code missing' }, { status: 400 });
    }
    if (!isMatchingUcansignState(state, expectedState)) {
        return NextResponse.json({ error: 'Invalid or expired OAuth state' }, { status: 400 });
    }

    try {
        // Exchange code for token
        const tokenResponse = await fetch('https://app.ucansign.com/openapi/user/oauth/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grantType: 'code',
                code: code,
                clientId: process.env.UCANSIGN_CLIENT_ID,
                clientSecret: process.env.UCANSIGN_CLIENT_SECRET
            })
        });

        const tokenData: unknown = await tokenResponse.json();
        const result = tokenResult(tokenData);

        // Check for success (support both "Success" and "success")
        if (!tokenResponse.ok || !result) {
            console.error('UCanSign token exchange failed', { status: tokenResponse.status });
            return NextResponse.json({ error: 'Token exchange failed' }, { status: 502 });
        }

        // Save to Supabase Profiles
        const { error } = await supabaseAdmin.from('profiles').update({
            ucansign_access_token: result.accessToken,
            ucansign_refresh_token: result.refreshToken,
            ucansign_expires_at: Date.now() + extractTokenExpiresInMs(result, DEFAULT_TOKEN_EXPIRES_MS)
        }).eq('id', userId);

        if (error) {
            console.error('Failed to update Supabase Profile:', error);
            return NextResponse.json({
                error: 'Failed to save token'
            }, { status: 500 });
        }

        const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL}${readUcansignReturnPath(state)}`;

        return NextResponse.redirect(targetUrl);

    } catch (error: unknown) {
        console.error('OAuth Callback Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
