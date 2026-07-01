// @ts-nocheck
import { NextResponse } from 'next/server';
import { viewDocumentEmbedding } from '@/lib/ucansign/client';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function POST(
    request: Request,
    context: any
) {
    try {
        await context.params; // Await params to satisfy Next.js 15+ requirement if strictly checked at runtime
        const body = await request.json();
        const { userId: rawUserId, documentId, ...data } = body;
        const supabaseAdmin = getSupabaseAdmin();

        if (!documentId || !data.redirectUrl) {
            return NextResponse.json({ error: 'Document ID and Redirect URL are required' }, { status: 400 });
        }

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, rawUserId);
        if (!authResult.ok) return authResult.response;
        const userId = authResult.userId;

        console.log('[API] View Embedding Params:', { userId, documentId, ...data });
        const result = await viewDocumentEmbedding(userId, documentId, data);
        console.log('[API] View Embedding Response:', JSON.stringify(result, null, 2));

        if (result && (result.result || result.url)) {
            return NextResponse.json(result.result || result);
        } else {
            return NextResponse.json({ error: 'Failed to create embedding link', details: result }, { status: 500 });
        }
    } catch (error: any) {
        console.error('View Embedding Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create embedding' }, { status: 500 });
    }
}
