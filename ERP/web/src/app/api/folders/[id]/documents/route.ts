// @ts-nocheck
import { NextResponse } from 'next/server';
import { moveDocumentsToFolder } from '@/lib/ucansign/client';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function PUT(
    request: Request,
    context: any
) {
    try {
        const { id } = await context.params;
        const { userId, documentIds } = await request.json();
        const supabaseAdmin = getSupabaseAdmin();
        console.log(`[API] Move to Folder request. FolderId: ${id}, UserId: ${userId}, DocIds:`, documentIds);

        if (!Array.isArray(documentIds)) {
            console.error('[API] Invalid payload:', { userId, documentIds });
            return NextResponse.json({ error: 'DocumentIDs array is required' }, { status: 400 });
        }

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userId);
        if (!authResult.ok) return authResult.response;

        await moveDocumentsToFolder(authResult.userId, id, documentIds);
        console.log('[API] Move success');
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Move Documents Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to move documents' }, { status: 500 });
    }
}
