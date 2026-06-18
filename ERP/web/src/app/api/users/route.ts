import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { normalizeAdminAssignableUserRole } from '@/lib/user-role-policy';
import {
    buildUserUpdateLookup,
    getErrorMessage,
    getRequesterProfile,
    getStringField,
    requireAdminRequester,
    type RequesterProfileRow,
    type UserListProfileRow
} from './userRouteHelpers';

export const dynamic = 'force-dynamic';
export { DELETE } from './deleteUserRoute';

type TargetProfileRow = RequesterProfileRow & { readonly status: string | null };

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const isDebug = searchParams.get('debug') === 'true';
        const companyFilter = searchParams.get('company');

        const supabaseAdmin = await getSupabaseAdmin();

        if (isDebug) {
            const adminCheck = await requireAdminRequester(supabaseAdmin, request);
            if ('error' in adminCheck) return adminCheck.error;

            const debugInfo: {
                envUrl: string | undefined;
                count: number;
                error: unknown;
                data: unknown[];
            } = {
                envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
                count: 0,
                error: null,
                data: []
            };

            const { data, error, count } = await supabaseAdmin
                .from('profiles')
                .select('*', { count: 'exact', head: false });

            debugInfo.count = count || 0;
            debugInfo.data = data || [];
            debugInfo.error = error;

            return NextResponse.json(debugInfo);
        }

        let companyScopedRequester: RequesterProfileRow | null = null;
        if (companyFilter) {
            const requester = await getRequesterProfile(supabaseAdmin, request, searchParams);
            if ('error' in requester) return requester.error;
            companyScopedRequester = requester.profile;
        }

        if (!companyFilter) {
            const adminCheck = await requireAdminRequester(supabaseAdmin, request);
            if ('error' in adminCheck) return adminCheck.error;
        }

        let query = supabaseAdmin
            .from('profiles')
            .select(`
                *,
                company:companies!company_id(name)
            `)
            .order('created_at', { ascending: false });

        if (companyFilter) {
            if (companyScopedRequester?.role === 'admin') {
                query = supabaseAdmin
                    .from('profiles')
                    .select(`*, company:companies!company_id!inner(name)`)
                    .eq('company.name', companyFilter)
                    .order('created_at', { ascending: false });
            } else {
                if (!companyScopedRequester?.company_id) {
                    return NextResponse.json([]);
                }
                query = supabaseAdmin
                    .from('profiles')
                    .select(`*, company:companies!company_id(name)`)
                    .eq('company_id', companyScopedRequester.company_id)
                    .order('created_at', { ascending: false });
            }
        }

        const { data: profiles, error } = await query;
        if (error) throw error;

        const safeUsers = (profiles as UserListProfileRow[]).map(profile => {
            const displayId = profile.email?.endsWith('@example.com')
                ? profile.email.split('@')[0]
                : profile.email;

            return {
                id: displayId,
                uuid: profile.id,
                name: profile.name,
                companyName: profile.company?.name || '-',
                companyId: profile.company_id,
                role: profile.role,
                status: profile.status,
                joinedAt: profile.created_at
            };
        });

        return NextResponse.json(safeUsers);
    } catch (error: unknown) {
        console.error('Get users error:', error);
        return NextResponse.json({ error: `[DEBUG-GET] 서버 오류: ${getErrorMessage(error)}` }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const id = getStringField(body, 'id');
        const email = getStringField(body, 'email');
        const status = getStringField(body, 'status');
        const rawRole = getStringField(body, 'role');
        const role = normalizeAdminAssignableUserRole(rawRole);

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        if (rawRole && !role) {
            return NextResponse.json({ error: '관리자 화면에서는 팀장, 매니저, 협력업체 직급만 지정할 수 있습니다.' }, { status: 400 });
        }

        const supabaseAdmin = await getSupabaseAdmin();
        const adminCheck = await requireAdminRequester(supabaseAdmin, request);
        if ('error' in adminCheck) return adminCheck.error;

        const lookup = buildUserUpdateLookup({ id, email });
        let targetProfile: TargetProfileRow | null = null;

        for (const candidateId of lookup.ids) {
            const { data } = await supabaseAdmin
                .from('profiles')
                .select('id, role, status, company_id')
                .eq('id', candidateId)
                .maybeSingle<TargetProfileRow>();
            if (data) {
                targetProfile = data;
                break;
            }
        }

        if (!targetProfile) {
            for (const candidateEmail of lookup.emails) {
                const { data } = await supabaseAdmin
                    .from('profiles')
                    .select('id, role, status, company_id')
                    .eq('email', candidateEmail)
                    .limit(1)
                    .maybeSingle<TargetProfileRow>();
                if (data) {
                    targetProfile = data;
                    break;
                }
            }
        }

        if (!targetProfile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const targetUuid = targetProfile.id;

        if (role && adminCheck.profile.id === targetUuid) {
            return NextResponse.json({ error: '본인 관리자 권한은 직접 낮출 수 없습니다.' }, { status: 400 });
        }

        if (role && targetProfile.role === 'admin') {
            const { count: otherAdminCount } = await supabaseAdmin
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('role', 'admin')
                .neq('id', targetUuid);

            if ((otherAdminCount || 0) === 0) {
                return NextResponse.json({ error: '최소 1명의 관리자는 유지해야 합니다.' }, { status: 400 });
            }
        }

        const updates: Record<string, string> = {};
        if (status) updates.status = status;
        if (role) updates.role = role;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
        }

        const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', targetUuid);
        if (error) throw error;

        const nextStatus = status || targetProfile.status;
        const nextRole = role || targetProfile.role;

        if (nextStatus === 'active' && nextRole === 'manager' && targetProfile.company_id) {
            const { data: company } = await supabaseAdmin
                .from('companies')
                .select('manager_id')
                .eq('id', targetProfile.company_id)
                .single();

            if (company && !company.manager_id) {
                await supabaseAdmin
                    .from('companies')
                    .update({ manager_id: targetUuid })
                    .eq('id', targetProfile.company_id);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: `[DEBUG-UPDATE] 서버 오류: ${getErrorMessage(error)}` }, { status: 500 });
    }
}
