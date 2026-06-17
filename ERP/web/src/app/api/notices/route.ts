import { NextResponse } from 'next/server';
import {
    formatNoticeRows,
    parseNoticeLimit,
    type NoticeAuthor,
    type NoticeRow
} from '@/lib/notices';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Service Role Client moved to handlers

// GET: Fetch notices (System + Team)
export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const companyName = searchParams.get('companyName');
        const limit = parseNoticeLimit(searchParams.get('limit'));

        // 1. Resolve Company ID if needed
        let companyId = null;
        if (companyName) {
            const { data: company } = await supabaseAdmin.from('companies').select('id').eq('name', companyName).single();
            if (company) companyId = company.id;
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
        console.error('Fetch notices error:', error);
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
        const body = await request.json();
        const { title, content, type, authorId, companyName, isPinned } = body;

        // Resolve IDs
        // Author
        const email = `${authorId}@example.com`;
        const { data: author } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
        if (!author) return NextResponse.json({ error: 'Author not found' }, { status: 400 });

        // Company
        let companyUuid = null;
        if (type === 'team' && companyName) {
            const { data: company } = await supabaseAdmin.from('companies').select('id').eq('name', companyName).single();
            if (company) companyUuid = company.id;
        }

        const { data: newNotice, error } = await supabaseAdmin
            .from('notices')
            .insert({
                title,
                content,
                type,
                author_id: author.id,
                company_id: companyUuid,
                is_pinned: isPinned || false
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(newNotice);
    } catch (error) {
        console.error('Create notice error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
