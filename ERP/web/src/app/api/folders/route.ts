import { NextResponse } from 'next/server';
import { getFolders, createFolder } from '@/lib/ucansign/client';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAuthenticatedUcansignUser } from '@/lib/ucansign/route-auth';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userIdParam = searchParams.get('userId');
        const supabaseAdmin = getSupabaseAdmin();

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userIdParam);
        if (!authResult.ok) return authResult.response;

        const folders = await getFolders(authResult.userId);
        return NextResponse.json(folders);
    } catch (error: any) {
        console.error('Folders Fetch Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch folders' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, name } = await request.json();
        const supabaseAdmin = getSupabaseAdmin();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const authResult = await requireAuthenticatedUcansignUser(supabaseAdmin, request, userId);
        if (!authResult.ok) return authResult.response;

        const newFolder = await createFolder(authResult.userId, name);
        return NextResponse.json(newFolder);
    } catch (error: any) {
        console.error('Folder Create Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create folder' }, { status: 500 });
    }
}
