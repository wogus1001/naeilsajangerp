import { NextResponse } from 'next/server';
import { getRequesterProfile } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const userIdParam = searchParams.get('userId');

        const profile = await getRequesterProfile(supabase, request, userIdParam);
        if (!profile) return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });

        let query = supabase.from('projects').select('*');

        // Filter: My Company OR Created By Me (exactly like RLS)
        // AND handle projects with NULL company_id by checking creators in the same company
        if (profile.company_id) {
            // 1. Get all members of the same company to support projects with NULL company_id
            const { data: members } = await supabase
                .from('profiles')
                .select('id')
                .eq('company_id', profile.company_id);

            const memberIds = members?.map(m => m.id) || [profile.id];

            // Format for Postgrest 'in' filter: (uuid1,uuid2,...)
            const memberIdsList = `(${memberIds.join(',')})`;

            query = query.or(`company_id.eq.${profile.company_id},created_by.in.${memberIdsList}`);
        } else {
            query = query.eq('created_by', profile.id);
        }

        const { data: projects, error } = await query.order('updated_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch projects:', error);
            throw error;
        }

        return NextResponse.json({ success: true, data: projects });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const userIdParam = searchParams.get('userId');

        const body = await request.json();
        const { id, title, status, category, participants, data } = body;

        // Use userId from query or body
        const targetUserId = userIdParam || body.userId;
        if (!targetUserId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
        }

        const requester = await getRequesterProfile(supabase, request, targetUserId);
        if (!requester) return NextResponse.json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' }, { status: 401 });

        // Ensure we have a valid UUID for the project id
        let projectId = id;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!projectId || !uuidRegex.test(projectId)) {
            projectId = crypto.randomUUID();
            console.log(`Generated new UUID for project: ${projectId} (received: ${id})`);
        }

        const { data: project, error } = await supabase
            .from('projects')
            .insert({
                id: projectId,
                title,
                status,
                category,
                participants,
                data,
                company_id: requester.company_id,
                created_by: requester.id
            })
            .select()
            .single();

        if (error) {
            console.error('Database insert error for project:', error);
            throw error;
        }

        return NextResponse.json({ success: true, project });

    } catch (error: any) {
        console.error('Project create error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
