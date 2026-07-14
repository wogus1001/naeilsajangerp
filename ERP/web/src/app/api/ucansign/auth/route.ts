import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    createUcansignState,
    requireAuthenticatedUcansignUser
} from '@/lib/ucansign/route-auth';

// Service Role Client
// Removed top level

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const supabaseAdmin = getSupabaseAdmin();
    const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userIdParam);
    if (!authResult.ok) return authResult.response;
    const userId = authResult.userId;

    const clientId = process.env.UCANSIGN_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({
            error: 'Configuration Error',
            message: 'UCANSIGN_CLIENT_ID is not defined in environment variables.'
        }, { status: 500 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/ucansign/callback`;
    const redirectParam = searchParams.get('redirect');
    const state = createUcansignState(redirectParam || '/profile?ucansign=connected');

    // Store UUID in cookie
    const cookieStore = await cookies();
    cookieStore.set('ucansign_pending_user', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Add Secure flag
        sameSite: 'lax', // Relax SameSite
        path: '/',
        maxAge: 60 * 5 // 5 minutes
    });
    cookieStore.set('ucansign_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 5
    });

    const authUrl = `https://app.ucansign.com/user/oauth/login?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    if (searchParams.get('response') === 'json') {
        return NextResponse.json({ url: authUrl });
    }

    return NextResponse.redirect(authUrl);
}
