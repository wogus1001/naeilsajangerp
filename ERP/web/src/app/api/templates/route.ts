import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getRequesterProfile } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    const supabase = await createClient();

    // 1. Get current user's company_id
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

    // 2. Fetch templates (System OR Shared Company)
    // Note: RLS policies generally handle this, but explicit query is safer for logic transparency
    let query = supabase
        .from('contract_templates')
        .select('*')
        .or(`is_system.eq.true,company_id.eq.${profile?.company_id},created_by.eq.${user.id}`)
        .order('name', { ascending: true }); // 기본 이름 정렬 (sort_order는 JS에서 처리)

    const { data: templates, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map snake_case (DB) to camelCase (Frontend)
    const mappedTemplates = templates.map(t => ({
        ...t,
        formSchema: t.form_schema,
        htmlTemplate: t.html_content,
        sort_order: t.sort_order ?? 9999, // null이면 맨 뒤로
    }));

    // sort_order 기준 JS 정렬 (null-safe, 컬럼 없어도 안전)
    mappedTemplates.sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

    return NextResponse.json(mappedTemplates);
}

export async function POST(request: NextRequest) {
    const body = await request.json();

    // Basic validation
    if (!body.name || !body.category) {
        return NextResponse.json({ error: 'Name and Category are required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    const supabase = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabase, request, userIdParam);
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Map camelCase (Frontend) to snake_case (DB)
    const dbData = {
        id: body.id || `t-${Date.now()}`,
        name: body.name,
        category: body.category,
        description: body.description,
        form_schema: body.formSchema || [],
        html_content: body.htmlTemplate || '',
        is_system: body.is_system || false,
        sort_order: body.sort_order, // 순서 업데이트
        company_id: requester.company_id,
        created_by: requester.id
    };

    const { data, error } = await supabase
        .from('contract_templates')
        .upsert(dbData)
        .select()
        .single();

    console.log('[DEBUG-SAVE] User:', requester.id);
    console.log('[DEBUG-SAVE] Company:', requester.company_id);
    console.log('[DEBUG-SAVE] Insert Result:', data, 'Error:', error);
    console.log('[DEBUG-SAVE] DB URL Segment:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(8, 20)); // Check which project

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map back for response
    const mappedData = {
        ...data,
        formSchema: data.form_schema,
        htmlTemplate: data.html_content,
    };

    return NextResponse.json(mappedData);
}
