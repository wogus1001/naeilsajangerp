import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { notifyAlimtalkSignupApproved } from '@/lib/alimtalk-signup-notifications';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isBrandStaffUserRole } from '@/lib/user-role-policy';
import { NextResponse } from 'next/server';

type StaffAction = 'approve' | 'promote' | 'demote';
const APPROVABLE_ROLES = new Set(['sub_manager', 'staff', 'partner_vendor']);

type ProfileRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly name: string | null;
    readonly email: string | null;
    readonly phone: string | null;
    readonly phone_normalized: string | null;
    readonly role: string | null;
    readonly status: string | null;
    readonly created_at: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringField(value: unknown, key: string): string | null {
    if (!isRecord(value)) return null;
    const rawValue = value[key];
    if (typeof rawValue !== 'string') return null;
    const trimmed = rawValue.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function isStaffAction(value: string | null): value is StaffAction {
    return value === 'approve' || value === 'promote' || value === 'demote';
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyName = searchParams.get('companyName');
        const companyId = searchParams.get('companyId');

        if (!companyName && !companyId) {
            return NextResponse.json({ error: 'Company ID or name is required' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);

        if (!requester) {
            return NextResponse.json({ error: 'authenticated session is required' }, { status: 401 });
        }

        if (!isAdmin(requester) && requester.role !== 'manager') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        let targetCompanyId = companyId;

        if (!targetCompanyId && companyName) {
            const { data: company } = await supabaseAdmin
                .from('companies')
                .select('id')
                .eq('name', companyName)
                .single();

            targetCompanyId = company?.id || null;
        }

        if (!targetCompanyId) {
            return NextResponse.json([], { status: 200 });
        }

        if (!isAdmin(requester) && requester.company_id !== targetCompanyId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('id, company_id, name, email, phone, phone_normalized, role, status, created_at')
            .eq('company_id', targetCompanyId)
            .returns<ProfileRow[]>();

        if (error) throw error;

        const safeStaff = (profiles || []).map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            joinedAt: user.created_at
        }));

        return NextResponse.json(safeStaff);
    } catch (error) {
        console.error('Fetch staff error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const targetUserId = getStringField(body, 'targetUserId');
        const action = getStringField(body, 'action');

        if (!targetUserId || !isStaffAction(action)) {
            return NextResponse.json({ error: 'Invalid staff action request' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);

        if (!requester || requester.role !== 'manager') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { data: targetUser, error: targetError } = await supabaseAdmin
            .from('profiles')
            .select('id, company_id, name, email, phone, phone_normalized, role, status, created_at')
            .eq('id', targetUserId)
            .single<ProfileRow>();

        if (targetError || !targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (targetUser.company_id !== requester.company_id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { count: managerCount } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', requester.company_id)
            .eq('role', 'manager')
            .eq('status', 'active');

        if (action === 'approve') {
            if (!APPROVABLE_ROLES.has(targetUser.role || '')) {
                return NextResponse.json({ error: '팀장은 담당자 또는 협력업체 가입 요청만 승인할 수 있습니다.' }, { status: 403 });
            }
            if (targetUser.status !== 'pending_approval') {
                return NextResponse.json({ error: '승인 대기 상태의 가입 요청만 승인할 수 있습니다.' }, { status: 400 });
            }
            await supabaseAdmin.from('profiles').update({ status: 'active' }).eq('id', targetUserId);

            let companyName = '';
            if (targetUser.company_id) {
                const { data: company } = await supabaseAdmin
                    .from('companies')
                    .select('name')
                    .eq('id', targetUser.company_id)
                    .maybeSingle<{ readonly name: string | null }>();
                companyName = company?.name || '';
            }

            try {
                await notifyAlimtalkSignupApproved({
                    companyId: targetUser.company_id,
                    companyName,
                    name: targetUser.name || '회원',
                    phone: targetUser.phone_normalized || targetUser.phone,
                    profileId: targetUserId,
                    supabaseAdmin
                });
            } catch (error) {
                console.error(
                    'Staff approval AlimTalk notification failed:',
                    error instanceof Error ? error.message : String(error)
                );
            }
        }

        if (action === 'promote') {
            if (!isBrandStaffUserRole(targetUser.role) || targetUser.status !== 'active') {
                return NextResponse.json({ error: '활성 직원 또는 매니저만 팀장으로 승격할 수 있습니다.' }, { status: 400 });
            }
            if ((managerCount || 0) >= 2) {
                return NextResponse.json({ error: '팀장은 최대 2명까지만 지정할 수 있습니다.' }, { status: 400 });
            }
            await supabaseAdmin.from('profiles').update({ role: 'manager' }).eq('id', targetUserId);
        }

        if (action === 'demote') {
            if (targetUser.role !== 'manager') {
                return NextResponse.json({ error: '해당 사용자는 팀장이 아닙니다.' }, { status: 400 });
            }
            if ((managerCount || 0) <= 1) {
                return NextResponse.json({ error: '최소 1명의 팀장은 유지되어야 합니다.' }, { status: 400 });
            }
            await supabaseAdmin.from('profiles').update({ role: 'staff' }).eq('id', targetUserId);
        }

        const { data: updatedUser } = await supabaseAdmin
            .from('profiles')
            .select('id, company_id, name, email, phone, phone_normalized, role, status, created_at')
            .eq('id', targetUserId)
            .single<ProfileRow>();

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Update staff error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
