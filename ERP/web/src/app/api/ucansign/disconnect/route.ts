
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

// Service Role Client
// Service Role Client
// Removed top level

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userIdParam = searchParams.get('userId');
        const supabaseAdmin = getSupabaseAdmin();

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userIdParam);
        if (!authResult.ok) return authResult.response;
        const userId = authResult.userId;

        // Remove UCanSign data
        // Remove UCanSign data
        const { error } = await supabaseAdmin.from('profiles').update({
            ucansign_access_token: null,
            ucansign_refresh_token: null,
            ucansign_expires_at: null
        }).eq('id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Disconnect API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
