import { NextResponse } from 'next/server';
import { createTemplateEmbedding } from '@/lib/ucansign/client';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId: rawUserId, ...data } = body;
        const supabaseAdmin = getSupabaseAdmin();

        if (!data.redirectUrl) {
            return NextResponse.json({ error: 'Redirect URL is required' }, { status: 400 });
        }

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, rawUserId);
        if (!authResult.ok) return authResult.response;

        const result = await createTemplateEmbedding(authResult.userId, data);

        if (result && result.result) {
            return NextResponse.json(result.result);
        } else {
            return NextResponse.json({ error: 'Failed to create embedding link' }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Template Create Embedding Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create embedding' }, { status: 500 });
    }
}
