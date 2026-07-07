import { NextResponse } from 'next/server';
import { getTemplates } from '@/lib/ucansign/client';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userIdParam = searchParams.get('userId');
        const supabaseAdmin = getSupabaseAdmin();

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userIdParam);
        if (!authResult.ok) return authResult.response;

        const templates = await getTemplates(authResult.userId);
        return NextResponse.json({ templates });
    } catch (error: any) {
        console.error('Template API Error:', error);
        if (error.message.includes('User is not connected')) {
            return NextResponse.json({ error: '유캔싸인 연동이 필요합니다.', code: 'NEED_AUTH' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
}
