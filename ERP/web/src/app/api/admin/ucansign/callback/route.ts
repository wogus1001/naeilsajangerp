import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { savePlatformUcansignTokens } from '@/lib/ucansign/platform-client';

export const dynamic = 'force-dynamic';

type PlatformState = {
    readonly requesterId: string;
    readonly returnTo: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeState(value: string | null): PlatformState | null {
    if (!value) return null;
    try {
        const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
        if (!isRecord(decoded)) return null;
        if (typeof decoded.requesterId !== 'string') return null;
        return {
            requesterId: decoded.requesterId,
            returnTo: typeof decoded.returnTo === 'string' ? decoded.returnTo : '/contracts/electronic'
        };
    } catch (error) {
        if (error instanceof Error) console.warn('Failed to decode platform UCanSign state:', error.message);
        return null;
    }
}

function extractTokens(value: unknown): { readonly accessToken: string; readonly refreshToken?: string } | null {
    if (!isRecord(value) || !isRecord(value.result)) return null;
    const accessToken = value.result.accessToken;
    const refreshToken = value.result.refreshToken;
    if (typeof accessToken !== 'string' || !accessToken) return null;
    if (typeof refreshToken === 'string' && refreshToken) return { accessToken, refreshToken };
    return { accessToken };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const cookieStore = await cookies();
    const cookieState = cookieStore.get('ucansign_platform_state')?.value || null;

    if (!code) return NextResponse.json({ error: 'Authorization code missing' }, { status: 400 });
    if (!state || state !== cookieState) return NextResponse.json({ error: 'Invalid authorization state' }, { status: 400 });

    const decodedState = decodeState(state);
    if (!decodedState) return NextResponse.json({ error: 'Invalid authorization payload' }, { status: 400 });

    try {
        if (!process.env.UCANSIGN_CLIENT_ID || !process.env.UCANSIGN_CLIENT_SECRET) {
            return NextResponse.json({ error: 'UCanSign OAuth env missing' }, { status: 500 });
        }
        const tokenResponse = await fetch('https://app.ucansign.com/openapi/user/oauth/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(20_000),
            body: JSON.stringify({
                grantType: 'code',
                code,
                clientId: process.env.UCANSIGN_CLIENT_ID,
                clientSecret: process.env.UCANSIGN_CLIENT_SECRET
            })
        });
        const tokenData: unknown = await tokenResponse.json();
        const tokens = extractTokens(tokenData);
        if (!tokenResponse.ok || !tokens) {
            return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 });
        }

        await savePlatformUcansignTokens(tokens, decodedState.requesterId);
        cookieStore.delete('ucansign_platform_state');

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        return NextResponse.redirect(`${appUrl}${decodedState.returnTo}?ucansign=connected`);
    } catch (error) {
        console.error('Admin UCANSIGN callback error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
