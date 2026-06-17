import { NextResponse } from 'next/server';
import {
    formatNoticeRows,
    type NoticeAuthor,
    type NoticeRow
} from '@/lib/notices';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Service Role Client
// Removed top level

export async function GET(request: Request, context: any) {
    const supabaseAdmin = getSupabaseAdmin();
    try {
        const params = await context.params;
        const id = params.id;

        const { data: notice, error } = await supabaseAdmin
            .from('notices')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !notice) {
            return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
        }

        // Increment views (Non-blocking or simple await)
        await supabaseAdmin.from('notices').update({ views: (notice.views || 0) + 1 }).eq('id', id);

        const rows: NoticeRow[] = [notice];
        const authors = await fetchNoticeAuthors(rows);
        const formatted = formatNoticeRows(rows, authors)[0];

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Fetch notice detail error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

async function fetchNoticeAuthors(rows: readonly NoticeRow[]): Promise<Map<string, NoticeAuthor>> {
    const authorIds = [...new Set(rows.flatMap(row => row.author_id ? [row.author_id] : []))];
    const authors = new Map<string, NoticeAuthor>();
    if (authorIds.length === 0) return authors;

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id,name,role')
        .in('id', authorIds);

    if (error) {
        console.warn('Fetch notice author warning:', error);
        return authors;
    }

    for (const author of data || []) {
        if (typeof author.id !== 'string') continue;
        authors.set(author.id, {
            name: typeof author.name === 'string' ? author.name : null,
            role: typeof author.role === 'string' ? author.role : null
        });
    }

    return authors;
}

export async function DELETE(request: Request, context: any) {
    const supabaseAdmin = getSupabaseAdmin();
    try {
        const params = await context.params;
        const id = params.id;

        const { error } = await supabaseAdmin.from('notices').delete().eq('id', id);

        if (error) {
            console.error('Delete error', error);
            return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete notice error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request, context: any) {
    const supabaseAdmin = getSupabaseAdmin();
    try {
        const params = await context.params;
        const id = params.id;
        const body = await request.json();
        const { title, content, type, isPinned } = body;

        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (type !== undefined) updates.type = type;
        if (isPinned !== undefined) updates.is_pinned = isPinned;

        if (Object.keys(updates).length > 0) {
            const { error } = await supabaseAdmin
                .from('notices')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
        }

        // Return updated object
        const { data: updated } = await supabaseAdmin.from('notices').select('*').eq('id', id).single();

        return NextResponse.json({
            ...updated,
            isPinned: updated?.is_pinned // backward compat
        });
    } catch (error) {
        console.error('Update notice error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
