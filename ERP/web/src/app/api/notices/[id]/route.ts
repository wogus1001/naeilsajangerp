import { NextResponse } from 'next/server';
import {
    canManageNotice,
    formatNoticeRows,
    type NoticeViewer,
    type NoticeAuthor,
    type NoticeRow
} from '@/lib/notices';
import type { RequesterProfile } from '@/lib/api-auth';
import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
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

function toNoticeViewer(requester: RequesterProfile): NoticeViewer {
    return {
        id: requester.id,
        role: requester.role || undefined,
        company_id: requester.company_id || undefined
    };
}

export async function DELETE(request: Request, context: any) {
    const supabaseAdmin = getSupabaseAdmin();
    try {
        const params = await context.params;
        const id = params.id;
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) {
            return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const { data: notice, error: fetchError } = await supabaseAdmin
            .from('notices')
            .select('id, author_id, company_id, type')
            .eq('id', id)
            .single();
        if (fetchError || !notice) return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
        if (!canManageNotice(toNoticeViewer(requester), notice)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

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
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) {
            return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const { data: notice, error: fetchError } = await supabaseAdmin
            .from('notices')
            .select('id, author_id, company_id, type')
            .eq('id', id)
            .single();
        if (fetchError || !notice) return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
        if (!canManageNotice(toNoticeViewer(requester), notice)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (type === 'system' && !isAdmin(requester)) {
            return NextResponse.json({ error: '관리자 권한이 필요합니다.', code: 'FORBIDDEN' }, { status: 403 });
        }

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
