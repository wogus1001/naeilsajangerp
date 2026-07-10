// @ts-nocheck
import { NextResponse } from 'next/server';
import { getDocumentHistory } from '@/lib/ucansign/client';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function GET(
    request: Request,
    context: any
) {
    try {
        const { searchParams } = new URL(request.url);
        const userIdParam = searchParams.get('userId');
        const params = await context.params;
        const supabaseAdmin = getSupabaseAdmin();

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userIdParam);
        if (!authResult.ok) return authResult.response;

        const history = await getDocumentHistory(authResult.userId, params.id);
        return NextResponse.json(history);
    } catch (error: any) {
        console.error('History Fetch Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch history' }, { status: 500 });
    }
}
