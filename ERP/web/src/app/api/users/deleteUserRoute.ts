import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    evaluateUserDeleteGuard,
    getRequesterProfile,
    UUID_REGEX,
    type RequesterProfileRow
} from './userRouteHelpers';

const USER_REFERENCE_CLEANUP_TABLES = [
    { table: 'properties', col: 'manager_id' },
    { table: 'customers', col: 'manager_id' },
    { table: 'contracts', col: 'user_id' },
    { table: 'schedules', col: 'user_id' },
    { table: 'notices', col: 'author_id' },
    { table: 'projects', col: 'created_by' },
    { table: 'contract_templates', col: 'created_by' },
    { table: 'companies', col: 'owner_id' },
    { table: 'companies', col: 'manager_id' }
] as const;

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const idToDelete = searchParams.get('id');

        if (!idToDelete) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        if (idToDelete === 'admin' || idToDelete.startsWith('admin@')) {
            return NextResponse.json({ error: 'Cannot delete admin account' }, { status: 403 });
        }

        const supabaseAdmin = await getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request, searchParams);
        if ('error' in requester) return requester.error;
        const requesterProfile = requester.profile;

        let targetUuid = idToDelete;
        const isUuid = UUID_REGEX.test(idToDelete);

        if (!isUuid) {
            let emailToSearch = idToDelete;
            if (!idToDelete.includes('@')) {
                emailToSearch = `${idToDelete}@example.com`;
            }

            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id, role, company_id')
                .eq('email', emailToSearch)
                .single<RequesterProfileRow>();

            if (!profile) {
                const { data: profileFallback } = await supabaseAdmin
                    .from('profiles')
                    .select('id, role, company_id')
                    .eq('email', idToDelete)
                    .single<RequesterProfileRow>();

                if (!profileFallback) {
                    return NextResponse.json({ error: 'User not found' }, { status: 404 });
                }
                targetUuid = profileFallback.id;
            } else {
                targetUuid = profile.id;

            }
        }

        const { data: targetProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, role, company_id')
            .eq('id', targetUuid)
            .single<RequesterProfileRow>();

        if (!targetProfile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const [otherManagersResult, otherMembersResult] = targetProfile.role === 'manager'
            ? await Promise.all([
                supabaseAdmin
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', targetProfile.company_id)
                    .eq('role', 'manager')
                    .neq('id', targetUuid),
                supabaseAdmin
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', targetProfile.company_id)
                    .neq('id', targetUuid)
            ])
            : [{ count: 0 }, { count: 0 }];

        if (otherManagersResult.error) throw otherManagersResult.error;
        if (otherMembersResult.error) throw otherMembersResult.error;

        const deleteGuard = evaluateUserDeleteGuard({
            requesterProfile,
            targetProfile,
            otherManagersCount: otherManagersResult.count || 0,
            otherMembersCount: otherMembersResult.count || 0
        });
        if (!deleteGuard.allowed) {
            return NextResponse.json({ error: deleteGuard.error }, { status: deleteGuard.status });
        }

        for (const { table, col } of USER_REFERENCE_CLEANUP_TABLES) {
            try {
                const { error } = await supabaseAdmin.from(table).update({ [col]: null }).eq(col, targetUuid);
                if (error) {
                    console.error(`Failed to unlink user reference ${table}.${col}:`, error);
                    return NextResponse.json({ error: '사용자 연결 데이터 정리 중 오류가 발생했습니다.' }, { status: 500 });
                }
            } catch (err: unknown) {
                console.error(`Exception unlinking user reference ${table}.${col}:`, err);
                return NextResponse.json({ error: '사용자 연결 데이터 정리 중 오류가 발생했습니다.' }, { status: 500 });
            }
        }

        const { count: projectCount } = await supabaseAdmin.from('projects').select('id', { count: 'exact', head: true }).eq('created_by', targetUuid);
        const { count: templateCount } = await supabaseAdmin.from('contract_templates').select('id', { count: 'exact', head: true }).eq('created_by', targetUuid);
        const { count: companyCount } = await supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('owner_id', targetUuid);

        if ((projectCount || 0) > 0 || (templateCount || 0) > 0 || (companyCount || 0) > 0) {
            return NextResponse.json({
                error: '데이터 연결 해제 실패로 사용자를 삭제할 수 없습니다.'
            }, { status: 409 });
        }

        const { data: profileForCleanup } = await supabaseAdmin
            .from('profiles')
            .select('company_id')
            .eq('id', targetUuid)
            .single();

        const companyIdToClean = profileForCleanup?.company_id;

        try {
            const { error: storageError } = await supabaseAdmin
                .schema('storage')
                .from('objects')
                .update({ owner: null })
                .eq('owner', targetUuid);

            if (storageError) {
                console.error('Storage object owner cleanup failed:', storageError);
            }
        } catch (error: unknown) {
            console.error('Failed to access storage schema for user cleanup:', error);
        }

        try {
            const { error: profileDeleteError } = await supabaseAdmin.from('profiles').delete().eq('id', targetUuid);
            if (profileDeleteError) {
                throw profileDeleteError;
            }
        } catch (error: unknown) {
            throw error;
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUuid);

        if (deleteError) {
            console.error('Supabase delete error:', deleteError);
            if (!deleteError.message.includes('User not found')) {
                throw deleteError;
            }
        }

        if (companyIdToClean) {
            const { count } = await supabaseAdmin
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyIdToClean);

            if (count === 0) {
                await supabaseAdmin.from('companies').delete().eq('id', companyIdToClean);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Delete user error:', error);
        return NextResponse.json({
            error: '사용자 삭제 중 서버 오류가 발생했습니다.'
        }, { status: 500 });
    }
}
