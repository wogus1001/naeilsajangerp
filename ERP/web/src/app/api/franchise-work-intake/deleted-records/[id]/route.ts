import { getRequesterProfile, isAdmin, type RequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

type DeleteResult = 'deleted' | 'not_found';

export type PermanentDeleteDependencies = {
    readonly getRequester: (request: Request) => Promise<RequesterProfile | null>;
    readonly deleteRecord: (id: string) => Promise<DeleteResult>;
};

const defaultDependencies: PermanentDeleteDependencies = {
    getRequester: async request => getRequesterProfile(getSupabaseAdmin(), request),
    deleteRecord: async id => {
        const { data, error } = await getSupabaseAdmin()
            .from('franchise_work_intake_deleted_records')
            .delete()
            .eq('id', id)
            .select('id')
            .maybeSingle<{ readonly id: string }>();
        if (error) throw error;
        return data ? 'deleted' : 'not_found';
    }
};

export async function handleDeletedWorkIntakeRecordDELETE(
    request: Request,
    context: RouteContext,
    dependencies: PermanentDeleteDependencies = defaultDependencies
) {
    try {
        const { id } = await context.params;
        if (!UUID_PATTERN.test(id)) {
            return fail(400, 'VALIDATION_ERROR', '완전삭제할 항목 ID가 올바르지 않습니다.');
        }

        const requester = await dependencies.getRequester(request);
        if (!requester) {
            return fail(401, 'AUTH_REQUIRED', '로그인 세션을 확인할 수 없습니다. 다시 로그인해주세요.');
        }
        if (!isAdmin(requester)) {
            return fail(403, 'FORBIDDEN', '관리자만 삭제 목록을 완전히 삭제할 수 있습니다.');
        }

        const result = await dependencies.deleteRecord(id);
        if (result === 'not_found') {
            return fail(404, 'NOT_FOUND', '완전삭제할 삭제 이력을 찾지 못했습니다.');
        }
        console.info('Franchise work intake permanent delete audit:', {
            actorId: requester.id,
            recordId: id,
            occurredAt: new Date().toISOString()
        });
        return ok({ success: true });
    } catch (error) {
        console.error('Franchise work intake permanent DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', '완전삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    return handleDeletedWorkIntakeRecordDELETE(request, context);
}
