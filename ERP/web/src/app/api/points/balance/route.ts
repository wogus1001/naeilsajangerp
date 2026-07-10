import { NextResponse } from 'next/server';
import { getPointBalance } from '@/lib/ucansign/client';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userIdParam = searchParams.get('userId');
        const supabaseAdmin = getSupabaseAdmin();

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userIdParam);
        if (!authResult.ok) return authResult.response;

        const balance = await getPointBalance(authResult.userId);
        return NextResponse.json({ balance });
    } catch (error: any) {
        console.error('Points Balance Fetch Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch points balance' }, { status: 500 });
    }
}
