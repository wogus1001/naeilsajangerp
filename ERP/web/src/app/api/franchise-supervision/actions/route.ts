import { fail, ok } from '@/lib/api-response';
import {
    canAccessSupervisorResource,
    cleanString,
    ensureCanManageSupervision,
    fetchLocationInCompany,
    getFirst,
    isMissingSupervisionSchemaError,
    readJsonBody,
    resolveProfileInCompany,
    resolveSupervisionAuth,
    resolveSupervisionCompanyId
} from '@/lib/franchise-supervision-api';
import { normalizeCorrectiveActionStatus } from '@/lib/franchise-supervision';

export const dynamic = 'force-dynamic';

type CorrectiveActionRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly assignee_profile_id: string | null;
    readonly created_by: string | null;
    readonly status: string | null;
};

async function readMutationScope(request: Request) {
    const body = await readJsonBody(request);
    const authResult = await resolveSupervisionAuth(request);
    if (!authResult.ok) return { ok: false as const, response: authResult.response };

    const companyScope = await resolveSupervisionCompanyId(
        authResult.auth,
        getFirst(body, ['companyId', 'company_id']),
        getFirst(body, ['companyName', 'company'])
    );
    if (!companyScope.ok) return { ok: false as const, response: companyScope.response };
    return { ok: true as const, auth: authResult.auth, body, companyId: companyScope.companyId };
}

export async function POST(request: Request) {
    try {
        const scope = await readMutationScope(request);
        if (!scope.ok) return scope.response;
        const guard = ensureCanManageSupervision(scope.auth.requester);
        if (guard) return guard;

        const locationId = cleanString(getFirst(scope.body, ['locationId', 'location_id']));
        if (!locationId) return fail(400, 'VALIDATION_ERROR', '운영점을 선택해주세요.');
        const location = await fetchLocationInCompany(scope.auth.supabaseAdmin, locationId, scope.companyId);
        if (!location.ok) return location.response;

        const assignee = await resolveProfileInCompany({
            supabaseAdmin: scope.auth.supabaseAdmin,
            rawProfileId: getFirst(scope.body, ['assigneeProfileId', 'assignee_profile_id']),
            companyId: scope.companyId,
            message: '담당자를 선택해주세요.'
        });
        if (!assignee.ok) return assignee.response;

        const { data, error } = await scope.auth.supabaseAdmin
            .from('franchise_corrective_actions')
            .insert({
                company_id: scope.companyId,
                report_id: cleanString(getFirst(scope.body, ['reportId', 'report_id'])) || null,
                location_id: location.location.id,
                assignee_profile_id: assignee.profileId,
                title: cleanString(getFirst(scope.body, ['title'])) || '시정요청',
                memo: cleanString(getFirst(scope.body, ['memo'])) || null,
                due_date: cleanString(getFirst(scope.body, ['dueDate', 'due_date'])) || null,
                status: normalizeCorrectiveActionStatus(getFirst(scope.body, ['status'])),
                created_by: scope.auth.requester.id,
                updated_by: scope.auth.requester.id
            })
            .select('id')
            .single<{ readonly id: string }>();
        if (error) throw error;
        return ok({ id: data.id }, 201);
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision action POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '시정요청을 저장하지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const scope = await readMutationScope(request);
        if (!scope.ok) return scope.response;

        const id = cleanString(getFirst(scope.body, ['id']));
        if (!id) return fail(400, 'VALIDATION_ERROR', '시정요청 ID가 필요합니다.');

        const { data: existing, error: findError } = await scope.auth.supabaseAdmin
            .from('franchise_corrective_actions')
            .select('id, company_id, assignee_profile_id, created_by, status')
            .eq('id', id)
            .maybeSingle<CorrectiveActionRow>();
        if (findError) throw findError;
        if (!existing) return fail(404, 'NOT_FOUND', '시정요청을 찾을 수 없습니다.');
        if (!canAccessSupervisorResource(scope.auth.requester, existing)) {
            return fail(403, 'FORBIDDEN', '시정요청을 수정할 권한이 없습니다.');
        }

        const updates: Record<string, unknown> = {
            updated_by: scope.auth.requester.id,
            updated_at: new Date().toISOString()
        };
        if (Object.prototype.hasOwnProperty.call(scope.body, 'status')) {
            const status = normalizeCorrectiveActionStatus(getFirst(scope.body, ['status']));
            updates.status = status;
            updates.completed_at = status === '완료' ? new Date().toISOString() : null;
        }
        if (Object.prototype.hasOwnProperty.call(scope.body, 'memo')) {
            updates.memo = cleanString(getFirst(scope.body, ['memo'])) || null;
        }
        if (!ensureCanManageSupervision(scope.auth.requester)) {
            if (cleanString(getFirst(scope.body, ['title']))) updates.title = cleanString(getFirst(scope.body, ['title']));
            if (cleanString(getFirst(scope.body, ['dueDate', 'due_date']))) updates.due_date = cleanString(getFirst(scope.body, ['dueDate', 'due_date']));
            const assigneeRaw = getFirst(scope.body, ['assigneeProfileId', 'assignee_profile_id']);
            if (assigneeRaw) {
                const assignee = await resolveProfileInCompany({
                    supabaseAdmin: scope.auth.supabaseAdmin,
                    rawProfileId: assigneeRaw,
                    companyId: scope.companyId,
                    message: '담당자를 선택해주세요.'
                });
                if (!assignee.ok) return assignee.response;
                updates.assignee_profile_id = assignee.profileId;
            }
        }

        const { error } = await scope.auth.supabaseAdmin
            .from('franchise_corrective_actions')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
        return ok({ success: true });
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision action PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '시정요청을 수정하지 못했습니다.');
    }
}
