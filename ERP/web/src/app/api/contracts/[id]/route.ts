// @ts-nocheck
import { NextResponse } from 'next/server';
import { uCanSignClient } from '@/lib/ucansign/client';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function GET(
    request: Request,
    context: any
) {
    try {
        const { searchParams } = new URL(request.url);
        const { id } = await context.params;
        const userIdParam = searchParams.get('userId');

        if (!id) {
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userIdParam);
        if (!authResult.ok) return authResult.response;
        const userId = authResult.userId;

        // Call UCanSign API to get document details
        const response = await uCanSignClient(userId, `/documents/${id}`);

        if (response?.code !== 0) {
            // Some error from UCanSign
            return NextResponse.json({
                error: response?.msg || 'Failed to fetch document details',
                details: response
            }, { status: 500 });
        }

        const result = response.result || {};
        if (!result.id && result.documentId) {
            result.id = result.documentId;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Document Detail API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
