
import { NextResponse } from 'next/server';
import { canAccessCompanyResource, getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const supabase = getSupabaseAdmin();
        const { id } = params;
        const requester = await getAuthenticatedRequesterProfile(supabase, request);
        if (!requester) return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });

        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!canAccessCompanyResource(requester, { company_id: project.company_id, user_id: project.created_by })) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(project);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const supabase = getSupabaseAdmin();
        const { id } = params;
        const requester = await getAuthenticatedRequesterProfile(supabase, request);
        if (!requester) return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });
        const body = await request.json();

        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('id, company_id, created_by')
            .eq('id', id)
            .single();
        if (fetchError || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        if (!canAccessCompanyResource(requester, { company_id: project.company_id, user_id: project.created_by })) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Extract fields to update
        const { title, status, category, participants, data } = body;

        const updates: any = { updated_at: new Date().toISOString() };
        if (title !== undefined) updates.title = title;
        if (status !== undefined) updates.status = status;
        if (category !== undefined) updates.category = category;
        if (participants !== undefined) updates.participants = participants;
        if (data !== undefined) updates.data = data;

        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const supabase = getSupabaseAdmin();
        const { id } = params;
        const requester = await getAuthenticatedRequesterProfile(supabase, request);
        if (!requester) return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });

        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('id, company_id, created_by')
            .eq('id', id)
            .single();
        if (fetchError || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        if (!canAccessCompanyResource(requester, { company_id: project.company_id, user_id: project.created_by })) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
