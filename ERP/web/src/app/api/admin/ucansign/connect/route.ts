import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { ok } from '@/lib/api-response';
import { fail } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { missingUcansignSendEnv } from '@/lib/ucansign/platform-config';

export const dynamic = 'force-dynamic';

function encodeState(value: Record<string, string>): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
    if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

    const clientId = process.env.UCANSIGN_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const missingEnv = missingUcansignSendEnv().filter(name => name !== 'UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID');
    if (!clientId || !appUrl || missingEnv.length > 0) {
        return fail(500, 'INTERNAL_ERROR', `Missing UCanSign env: ${[...missingEnv, !appUrl ? 'NEXT_PUBLIC_APP_URL' : ''].filter(Boolean).join(', ')}`);
    }

    const { searchParams } = new URL(request.url);
    const returnToRaw = searchParams.get('returnTo') || '/contracts/electronic';
    const returnTo = returnToRaw.startsWith('/') && !returnToRaw.startsWith('//')
        ? returnToRaw
        : '/contracts/electronic';
    const state = encodeState({
        requesterId: requester.id,
        nonce: crypto.randomUUID(),
        returnTo
    });
    const cookieStore = await cookies();
    cookieStore.set('ucansign_platform_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 5
    });

    const redirectUri = `${appUrl}/api/admin/ucansign/callback`;
    const authUrl = `https://app.ucansign.com/user/oauth/login?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    if (request.headers.get('accept')?.includes('application/json')) {
        return ok({ authUrl });
    }
    return NextResponse.redirect(authUrl);
}
