import { fail, ok } from '@/lib/api-response';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyProfileRecipients } from '@/lib/alimtalk-event-notifications';
import { buildSupervisionCorrectiveActionSourceSchedule } from '@/lib/franchise-phase2-source-schedules';
import { trySyncFranchiseOperationalSchedule } from '@/lib/franchise-phase2-schedule-sync';
import {
    canAccessSupervisorResource,
    cleanString,
    ensureCanManageSupervision,
    fetchLocationInCompany,
    getFirst,
    isMissingSupervisionSchemaError,
    isSupervisionResourceInCompany,
    readJsonBody,
    resolveProfileInCompany,
    resolveSupervisionAuth,
    resolveSupervisionCompanyId
} from '@/lib/franchise-supervision-api';
import { normalizeCorrectiveActionStatus, type CorrectiveActionEventType } from '@/lib/franchise-supervision';

export const dynamic = 'force-dynamic';

type CorrectiveActionRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly assignee_profile_id: string | null;
    readonly completed_at: string | null;
    readonly created_by: string | null;
    readonly due_date: string | null;
    readonly location?: { readonly name: string | null } | null;
    readonly status: string | null;
    readonly title: string | null;
};

type ReportScopeRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly location_id: string | null;
};

async function syncCorrectiveActionSchedule(input: {
    readonly action: CorrectiveActionRow;
    readonly supabaseAdmin: SupabaseClient;
}) {
    const schedule = buildSupervisionCorrectiveActionSourceSchedule({
        actionId: input.action.id,
        assigneeProfileId: input.action.assignee_profile_id || '',
        companyId: input.action.company_id || '',
        completedAt: input.action.completed_at,
        dueDate: input.action.due_date,
        locationName: input.action.location?.name || '운영점',
        status: input.action.status || '요청',
        title: input.action.title || '시정요청'
    });
    if (!schedule) return { status: 'synced' as const };
    return trySyncFranchiseOperationalSchedule(input.supabaseAdmin, schedule);
}

async function resolveReportId(input: {
    readonly companyId: string;
    readonly locationId: string;
    readonly reportId: string;
    readonly supabaseAdmin: SupabaseClient;
}): Promise<string | null> {
    if (!input.reportId) return null;
    const { data, error } = await input.supabaseAdmin
        .from('franchise_inspection_reports')
        .select('id, company_id, location_id')
        .eq('id', input.reportId)
        .maybeSingle<ReportScopeRow>();
    if (error) throw error;
    if (!data || data.company_id !== input.companyId || data.location_id !== input.locationId) {
        throw new Error('SUPERVISION_REPORT_SCOPE_MISMATCH');
    }
    return data.id;
}

async function insertActionEvent(input: {
    readonly actionId: string;
    readonly actorProfileId: string;
    readonly companyId: string;
    readonly eventType: CorrectiveActionEventType;
    readonly fromStatus: string | null;
    readonly memo: string;
    readonly supabaseAdmin: SupabaseClient;
    readonly toStatus: string | null;
}) {
    const { error } = await input.supabaseAdmin
        .from('franchise_corrective_action_events')
        .insert({
            company_id: input.companyId,
            corrective_action_id: input.actionId,
            event_type: input.eventType,
            from_status: input.fromStatus,
            to_status: input.toStatus,
            memo: input.memo || null,
            actor_profile_id: input.actorProfileId
        });
    if (error) throw error;
}

async function notifyCorrectiveActionDue(input: {
    readonly actionId: string;
    readonly assigneeProfileId: string;
    readonly companyId: string;
    readonly dueDate: string;
    readonly locationName: string;
    readonly supabaseAdmin: SupabaseClient;
    readonly title: string;
}) {
    try {
        await notifyProfileRecipients({
            companyId: input.companyId,
            profileIds: [input.assigneeProfileId],
            scenarioKey: 'supervision_corrective_action_due',
            sourceId: input.actionId,
            sourceType: 'supervision-corrective-action-due',
            supabaseAdmin: input.supabaseAdmin,
            variables: {
                운영점명: input.locationName,
                시정항목: input.title,
                기한: input.dueDate || '-'
            }
        });
    } catch (error) {
        console.warn('Supervision corrective action AlimTalk notification skipped:', error);
    }
}

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
        const reportId = await resolveReportId({
            companyId: scope.companyId,
            locationId: location.location.id,
            reportId: cleanString(getFirst(scope.body, ['reportId', 'report_id'])),
            supabaseAdmin: scope.auth.supabaseAdmin
        });

        const { data, error } = await scope.auth.supabaseAdmin
            .from('franchise_corrective_actions')
            .insert({
                company_id: scope.companyId,
                report_id: reportId,
                location_id: location.location.id,
                assignee_profile_id: assignee.profileId,
                title: cleanString(getFirst(scope.body, ['title'])) || '시정요청',
                memo: cleanString(getFirst(scope.body, ['memo'])) || null,
                due_date: cleanString(getFirst(scope.body, ['dueDate', 'due_date'])) || null,
                status: normalizeCorrectiveActionStatus(getFirst(scope.body, ['status'])),
                created_by: scope.auth.requester.id,
                updated_by: scope.auth.requester.id
            })
            .select('id, company_id, assignee_profile_id, completed_at, created_by, due_date, status, title, location:franchise_locations(name)')
            .single<CorrectiveActionRow>();
        if (error) throw error;
        await insertActionEvent({
            actionId: data.id,
            actorProfileId: scope.auth.requester.id,
            companyId: scope.companyId,
            eventType: '생성',
            fromStatus: null,
            memo: cleanString(getFirst(scope.body, ['memo'])) || '',
            supabaseAdmin: scope.auth.supabaseAdmin,
            toStatus: normalizeCorrectiveActionStatus(getFirst(scope.body, ['status']))
        });
        await notifyCorrectiveActionDue({
            actionId: data.id,
            assigneeProfileId: assignee.profileId,
            companyId: scope.companyId,
            dueDate: cleanString(getFirst(scope.body, ['dueDate', 'due_date'])),
            locationName: location.location.name || '운영점',
            supabaseAdmin: scope.auth.supabaseAdmin,
            title: cleanString(getFirst(scope.body, ['title'])) || '시정요청'
        });
        const scheduleSync = await syncCorrectiveActionSchedule({ action: data, supabaseAdmin: scope.auth.supabaseAdmin });
        return ok({ id: data.id, scheduleSyncRequired: scheduleSync.status === 'failed' }, 201);
    } catch (error) {
        if (error instanceof Error && error.message === 'SUPERVISION_REPORT_SCOPE_MISMATCH') {
            return fail(403, 'FORBIDDEN', '보고서의 회사 또는 운영점 범위가 일치하지 않습니다.');
        }
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
            .select('id, company_id, assignee_profile_id, completed_at, created_by, due_date, status, title, location:franchise_locations(name)')
            .eq('id', id)
            .maybeSingle<CorrectiveActionRow>();
        if (findError) throw findError;
        if (!existing) return fail(404, 'NOT_FOUND', '시정요청을 찾을 수 없습니다.');
        if (!isSupervisionResourceInCompany(existing, scope.companyId)) {
            return fail(403, 'FORBIDDEN', '시정요청의 회사 범위가 일치하지 않습니다.');
        }
        if (!canAccessSupervisorResource(scope.auth.requester, existing)) {
            return fail(403, 'FORBIDDEN', '시정요청을 수정할 권한이 없습니다.');
        }

        const updates: Record<string, unknown> = {
            updated_by: scope.auth.requester.id,
            updated_at: new Date().toISOString()
        };
        const hadStatusUpdate = Object.prototype.hasOwnProperty.call(scope.body, 'status');
        if (hadStatusUpdate) {
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

        const { data: updated, error } = await scope.auth.supabaseAdmin
            .from('franchise_corrective_actions')
            .update(updates)
            .eq('id', id)
            .select('id, company_id, assignee_profile_id, completed_at, created_by, due_date, status, title, location:franchise_locations(name)')
            .single<CorrectiveActionRow>();
        if (error) throw error;
        await insertActionEvent({
            actionId: id,
            actorProfileId: scope.auth.requester.id,
            companyId: scope.companyId,
            eventType: hadStatusUpdate ? '상태변경' : '메모변경',
            fromStatus: existing.status,
            memo: cleanString(getFirst(scope.body, ['memo'])) || '',
            supabaseAdmin: scope.auth.supabaseAdmin,
            toStatus: hadStatusUpdate ? String(updates.status || '') : existing.status
        });
        const scheduleSync = await syncCorrectiveActionSchedule({ action: updated, supabaseAdmin: scope.auth.supabaseAdmin });
        return ok({ success: true, scheduleSyncRequired: scheduleSync.status === 'failed' });
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision action PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '시정요청을 수정하지 못했습니다.');
    }
}
