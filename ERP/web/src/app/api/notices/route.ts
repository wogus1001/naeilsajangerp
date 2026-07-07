import { NextResponse } from 'next/server';
import {
    formatNoticeRows,
    parseNoticeLimit,
    type NoticeAuthor,
    type NoticeRow
} from '@/lib/notices';
import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Service Role Client moved to handlers

// GET: Fetch notices (System + Team)
export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const companyName = searchParams.get('companyName');
        const limit = parseNoticeLimit(searchParams.get('limit'));
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) {
            return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
        }

        // 1. Resolve Company ID if needed
        let companyId: string | null = null;
        if (companyName) {
            const { data: company } = await supabaseAdmin.from('companies').select('id').eq('name', companyName).single();
            if (!company) return NextResponse.json([]);
            companyId = company.id;
        }
        if (!isAdmin(requester)) {
            if (companyId && companyId !== requester.company_id) {
                return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
            }
            companyId = requester.company_id;
        }

        // 2. Build Query
        let query = supabaseAdmin
            .from('notices')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (companyId) {
            // (type = 'system' AND company_id IS NULL) OR (company_id = :companyId)
            // Supabase 'or' syntax: "condition1,condition2"
            query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
        } else {
            // If no company context, only show system notices
            query = query.is('company_id', null);
        }

        if (limit) query = query.limit(limit);

        const { data: notices, error } = await query;

        if (error) throw error;

        const rows: NoticeRow[] = Array.isArray(notices) ? notices : [];
        const authors = await fetchNoticeAuthors(rows);
        const formatted = formatNoticeRows(rows, authors);

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Fetch notices error:', error instanceof Error ? error.message : String(error));
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
        console.warn('Fetch notice authors warning:', error);
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

// POST: Create Notice
export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body: unknown = await request.json();
        const title = readText(body, 'title');
        const content = readText(body, 'content');
        const type = readText(body, 'type');
        const companyName = readText(body, 'companyName');
        const isPinned = readBoolean(body, 'isPinned');

        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) {
            return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
        }
        if (type === 'system' && !isAdmin(requester)) {
            return NextResponse.json({ error: '관리자 권한이 필요합니다.', code: 'FORBIDDEN' }, { status: 403 });
        }

        let companyUuid = null;
        if (type === 'team' && isAdmin(requester) && companyName) {
            const { data: company } = await supabaseAdmin.from('companies').select('id').eq('name', companyName).single();
            if (company) companyUuid = company.id;
        } else if (type === 'team') {
            companyUuid = requester.company_id;
        }

        if (type === 'team' && !companyUuid) {
            return NextResponse.json({ error: 'Company scope is required' }, { status: 400 });
        }

        const { data: newNotice, error } = await supabaseAdmin
            .from('notices')
            .insert({
                title,
                content,
                type,
                author_id: requester.id,
                company_id: companyUuid,
                is_pinned: isPinned
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(newNotice);
    } catch (error) {
        console.error('Create notice error:', error instanceof Error ? error.message : String(error));
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(source: unknown, key: string): string {
    if (!isRecord(source)) return '';
    const value = source[key];
    return typeof value === 'string' ? value.trim() : '';
}

function readBoolean(source: unknown, key: string): boolean {
    if (!isRecord(source)) return false;
    return source[key] === true;
}
