import { NextResponse } from 'next/server';
import { getPointChargeHistory } from '@/lib/ucansign/client';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userIdParam = searchParams.get('userId');
        const supabaseAdmin = getSupabaseAdmin();

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userIdParam);
        if (!authResult.ok) return authResult.response;

        const history = await getPointChargeHistory(authResult.userId);
        return NextResponse.json(history);
    } catch (error: any) {
        console.error('Points Charge History Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch charge history' }, { status: 500 });
    }
}
