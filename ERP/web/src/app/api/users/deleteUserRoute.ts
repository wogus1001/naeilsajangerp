import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    getErrorMessage,
    getErrorValue,
    getRequesterProfile,
    stringifyError,
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

                if (profile.role === 'manager') {
                    const { count: otherManagersCount } = await supabaseAdmin
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', profile.company_id)
                        .eq('role', 'manager')
                        .neq('id', targetUuid);

                    const { count: otherMembersCount } = await supabaseAdmin
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', profile.company_id)
                        .neq('id', targetUuid);

                    const otherManagers = otherManagersCount || 0;
                    const otherMembers = otherMembersCount || 0;

                    if (otherManagers === 0 && otherMembers > 0) {
                        return NextResponse.json({
                            error: '남은 직원이 있는 경우, 팀장은 최소 1명 이상 유지되어야 합니다. 다른 직원에게 팀장 권한을 위임하거나, 모든 직원을 정리한 후 다시 시도해주세요.'
                        }, { status: 400 });
                    }
                }
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

        if (requesterProfile.role !== 'admin' && requesterProfile.id !== targetUuid) {
            return NextResponse.json({ error: 'Forbidden: You can only delete your own account' }, { status: 403 });
        }

        for (const { table, col } of USER_REFERENCE_CLEANUP_TABLES) {
            try {
                console.log(`[DEBUG-DELETE] Unlinking ${table}.${col}...`);
                const { error } = await supabaseAdmin.from(table).update({ [col]: null }).eq(col, targetUuid);
                if (error) {
                    console.error(`[DEBUG-DELETE] Failed to unlink ${table}: ${error.message}`);
                    return NextResponse.json({ error: `[DEBUG-DELETE] Failed to unlink ${table}: ${error.message}` }, { status: 500 });
                }
            } catch (err: unknown) {
                console.error(`[DEBUG-DELETE] Exception unlinking ${table}:`, err);
                return NextResponse.json({ error: `[DEBUG-DELETE] Exception unlinking ${table}: ${getErrorMessage(err)}` }, { status: 500 });
            }
        }

        const { count: projectCount } = await supabaseAdmin.from('projects').select('id', { count: 'exact', head: true }).eq('created_by', targetUuid);
        const { count: templateCount } = await supabaseAdmin.from('contract_templates').select('id', { count: 'exact', head: true }).eq('created_by', targetUuid);
        const { count: companyCount } = await supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('owner_id', targetUuid);

        console.log(`[DEBUG-DELETE] Cleanup Verification - Projects: ${projectCount}, Templates: ${templateCount}, Companies: ${companyCount}`);

        if ((projectCount || 0) > 0 || (templateCount || 0) > 0 || (companyCount || 0) > 0) {
            return NextResponse.json({
                error: `데이터 연결 해제 실패. 프로젝트: ${projectCount}, 템플릿: ${templateCount}, 회사소유: ${companyCount}. (DB 제약조건으로 인해 업데이트가 무시되었을 수 있습니다.)`
            }, { status: 409 });
        }

        const { data: profileForCleanup } = await supabaseAdmin
            .from('profiles')
            .select('company_id')
            .eq('id', targetUuid)
            .single();

        const companyIdToClean = profileForCleanup?.company_id;

        try {
            console.log('[DEBUG-DELETE] Anonymizing storage objects...');
            const { error: storageError } = await supabaseAdmin
                .schema('storage')
                .from('objects')
                .update({ owner: null })
                .eq('owner', targetUuid);

            if (storageError) {
                console.error('[DEBUG-DELETE] Storage unlink failed (will try ignore):', storageError);
            } else {
                console.log('[DEBUG-DELETE] Storage objects anonymized successfully.');
            }
        } catch (error: unknown) {
            console.error('[DEBUG-DELETE] Failed to access storage schema:', error);
        }

        try {
            const { error: profileDeleteError } = await supabaseAdmin.from('profiles').delete().eq('id', targetUuid);
            if (profileDeleteError) {
                console.error('[DEBUG-DELETE] Profile delete failed:', profileDeleteError);
                throw profileDeleteError;
            }
        } catch (error: unknown) {
            console.error('[DEBUG-DELETE] Captured profile delete error:', error);
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
                console.log(`[CLEANUP] Deleting empty company: ${companyIdToClean}`);
                await supabaseAdmin.from('companies').delete().eq('id', companyIdToClean);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Delete user error:', error);

        const errorDetails = {
            message: getErrorMessage(error),
            code: getErrorValue(error, 'code'),
            details: getErrorValue(error, 'details'),
            hint: getErrorValue(error, 'hint'),
            constraint: getErrorValue(error, 'constraint'),
            tableName: getErrorValue(error, 'table'),
            columnName: getErrorValue(error, 'column'),
            fullError: stringifyError(error)
        };

        return NextResponse.json({
            error: `[DEBUG-DELETE] 서버 오류: ${getErrorMessage(error)}`,
            debug: errorDetails
        }, { status: 500 });
    }
}
