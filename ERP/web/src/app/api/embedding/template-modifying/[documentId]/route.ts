// @ts-nocheck
import { NextResponse } from 'next/server';
import { modifyTemplateEmbedding } from '@/lib/ucansign/client';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function POST(
    request: Request,
    context: any
) {
    try {
        const { documentId: paramDocumentId } = await context.params;
        const body = await request.json();
        const { userId: rawUserId, documentId, ...data } = body;
        const supabaseAdmin = getSupabaseAdmin();

        if (!documentId || !data.redirectUrl) {
            return NextResponse.json({ error: 'Document ID and Redirect URL are required' }, { status: 400 });
        }

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, rawUserId);
        if (!authResult.ok) return authResult.response;

        const result = await modifyTemplateEmbedding(authResult.userId, documentId, data);

        if (result && result.result) {
            return NextResponse.json(result.result);
        } else {
            return NextResponse.json({ error: 'Failed to create embedding link' }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Template Modify Embedding Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create embedding' }, { status: 500 });
    }
}
