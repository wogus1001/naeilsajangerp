import { NextRequest, NextResponse } from 'next/server';
import { canAccessCompanyResource, getRequesterProfile, isAdmin } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const body = await request.json();

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    const requester = await getRequesterProfile(supabase, request, userIdParam);
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if system template
    const { data: existing } = await supabase.from('contract_templates').select('is_system, created_by, company_id').eq('id', id).single();
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    if (existing.is_system && !isAdmin(requester)) {
        return NextResponse.json({ error: '기본 템플릿은 관리자만 수정할 수 있습니다.' }, { status: 403 });
    }
    if (!canAccessCompanyResource(requester, { company_id: existing.company_id, user_id: existing.created_by })) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Map camelCase (Frontend) to snake_case (DB)
    const updateData: any = {
        updated_at: new Date().toISOString()
    };
    if (body.name) updateData.name = body.name;
    if (body.category) updateData.category = body.category;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.formSchema) updateData.form_schema = body.formSchema;
    if (body.htmlTemplate) updateData.html_content = body.htmlTemplate;
    if (body.is_system !== undefined) updateData.is_system = body.is_system;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order; // 순서 업데이트 지원

    const { error } = await supabase
        .from('contract_templates')
        .update(updateData)
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = getSupabaseAdmin();
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    const requester = await getRequesterProfile(supabase, request, userIdParam);
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Explicit check for system template protection
    const { data: existing } = await supabase.from('contract_templates').select('is_system, company_id, created_by').eq('id', id).single();
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    if (existing?.is_system) {
        return NextResponse.json({ error: '기본 템플릿은 삭제할 수 없습니다.' }, { status: 403 });
    }
    if (!canAccessCompanyResource(requester, { company_id: existing.company_id, user_id: existing.created_by })) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
