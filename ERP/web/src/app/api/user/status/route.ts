import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    if (!userIdParam) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userIdParam);
        if (!authResult.ok) return authResult.response;

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('ucansign_access_token')
            .eq('id', authResult.userId)
            .single();

        if (profile && profile.ucansign_access_token) {
            return NextResponse.json({ connected: true });
        } else {
            return NextResponse.json({ connected: false });
        }

    } catch (e) {
        console.error('Error checking user status:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
