import { NextResponse } from 'next/server';
import { uCanSignClient } from '@/lib/ucansign/client';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const contractId = searchParams.get('contractId');
    const type = searchParams.get('type') || 'document'; // document, audit-trail, full-file, attachment
    const attachmentId = searchParams.get('attachmentId');

    if (!contractId) {
        return NextResponse.json({ error: 'ContractId is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userIdParam);
    if (!authResult.ok) return authResult.response;
    const userId = authResult.userId;

    try {
        let url = '';
        if (type === 'audit-trail') {
            // GET /documents/:id/audit-trail
            const res = await uCanSignClient(userId, `/documents/${contractId}/audit-trail`);
            url = res?.result?.file;
        } else if (type === 'full-file') {
            // GET /documents/:id/full-file
            const res = await uCanSignClient(userId, `/documents/${contractId}/full-file`);
            url = res?.result?.file;
        } else if (type === 'attachment') {
            if (!attachmentId) throw new Error('Attachment ID required');
            // GET /documents/:id/attachments/:attachmentId
            const res = await uCanSignClient(userId, `/documents/${contractId}/attachments/${attachmentId}`);
            url = res?.result?.file;
        } else {
            // Default: Document File
            const res = await uCanSignClient(userId, `/documents/${contractId}/file`);
            url = res?.result?.file;
        }

        if (url) {
            return NextResponse.json({ url });
        } else {
            return NextResponse.json({ error: 'File not found or processing' }, { status: 404 });
        }

    } catch (error: any) {
        console.error('Download API Error:', error?.message || error);
        return NextResponse.json({ error: error.message || 'Failed to get download link' }, { status: 500 });
    }
}
