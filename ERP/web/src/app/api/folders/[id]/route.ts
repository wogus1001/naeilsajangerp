// @ts-nocheck
import { NextResponse } from 'next/server';
import { renameFolder, deleteFolder } from '@/lib/ucansign/client';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function PUT(
    request: Request,
    context: any
) {
    try {
        const { id } = await context.params;
        const { userId, name } = await request.json();
        const supabaseAdmin = getSupabaseAdmin();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userId);
        if (!authResult.ok) return authResult.response;

        await renameFolder(authResult.userId, id, name);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Folder Rename Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to rename folder' }, { status: 500 });
    }
}

export async function DELETE(
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

        await deleteFolder(authResult.userId, id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Folder Delete Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete folder' }, { status: 500 });
    }
}
