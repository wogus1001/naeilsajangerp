// @ts-nocheck
import { NextResponse } from 'next/server';
import { getTemplate } from '@/lib/ucansign/client';

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

        const supabaseAdmin = getSupabaseAdmin();
        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userIdParam);
        if (!authResult.ok) return authResult.response;
        const userId = authResult.userId;

        console.log(`Fetching template details for ID: ${id}, UserId: ${userId}`);

        if (!id) {
            return NextResponse.json({ error: 'Template ID is missing' }, { status: 400 });
        }

        const template = await getTemplate(userId, id);
        return NextResponse.json(template || {});
    } catch (error: any) {
        console.error('Template Detail API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch template details' }, { status: 500 });
    }
}
