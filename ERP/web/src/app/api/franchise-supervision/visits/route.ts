import { fail, ok } from '@/lib/api-response';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyProfileRecipients } from '@/lib/alimtalk-event-notifications';
import {
    canAccessSupervisorResource,
    cleanString,
    ensureCanManageSupervision,
    fetchLocationInCompany,
    getFirst,
    isMissingSupervisionSchemaError,
    isSupervisionManager,
    readJsonBody,
    resolveProfileInCompany,
    resolveSupervisionAuth,
    resolveSupervisionCompanyId
} from '@/lib/franchise-supervision-api';
import { normalizeVisitPurpose, normalizeVisitStatus } from '@/lib/franchise-supervision';

export const dynamic = 'force-dynamic';

type VisitAccessRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly location?: { readonly name: string | null } | null;
    readonly location_id: string | null;
    readonly purpose: string | null;
    readonly schedule_id: string | null;
    readonly status: string | null;
    readonly supervisor_profile_id: string | null;
    readonly visit_date: string | null;
    readonly created_by: string | null;
};

type AssignmentScopeRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly location_id: string | null;
    readonly supervisor_profile_id: string | null;
    readonly active: boolean | null;
};

function readLocationName(location: VisitAccessRow['location']): string {
    return location?.name || '운영점';
}

async function resolveAssignmentId(input: {
    readonly assignmentId: string;
    readonly companyId: string;
    readonly locationId: string;
    readonly supervisorProfileId: string;
    readonly supabaseAdmin: SupabaseClient;
}): Promise<string | null> {
    if (!input.assignmentId) return null;
    const { data, error } = await input.supabaseAdmin
        .from('franchise_supervisor_assignments')
        .select('id, company_id, location_id, supervisor_profile_id, active')
        .eq('id', input.assignmentId)
        .maybeSingle<AssignmentScopeRow>();
    if (error) throw error;
    if (!data || data.company_id !== input.companyId || data.location_id !== input.locationId || data.supervisor_profile_id !== input.supervisorProfileId || data.active === false) {
        throw new Error('SUPERVISION_ASSIGNMENT_SCOPE_MISMATCH');
    }
    return data.id;
}

async function syncSchedule(input: {
    readonly existing: VisitAccessRow;
    readonly nextPurpose: string;
    readonly nextStatus: string;
    readonly nextSupervisorProfileId: string | null;
    readonly nextVisitDate: string | null;
    readonly supabaseAdmin: SupabaseClient;
}) {
    if (!input.existing.schedule_id) return;
    const { error } = await input.supabaseAdmin
        .from('schedules')
        .update({
            date: input.nextVisitDate || input.existing.visit_date,
            title: `${readLocationName(input.existing.location)} ${input.nextPurpose}`,
            status: input.nextStatus === '취소' ? 'cancelled' : 'scheduled',
            user_id: input.nextSupervisorProfileId || input.existing.supervisor_profile_id,
            updated_at: new Date().toISOString()
        })
        .eq('id', input.existing.schedule_id);
    if (error) throw error;
}

async function createSchedule(input: {
    readonly companyId: string;
    readonly locationName: string;
    readonly supervisorProfileId: string;
    readonly supabaseAdmin: SupabaseClient;
    readonly visitDate: string;
    readonly purpose: string;
}) {
    const { data, error } = await input.supabaseAdmin
        .from('schedules')
        .insert({
            company_id: input.companyId,
            user_id: input.supervisorProfileId,
            title: `${input.locationName} ${input.purpose}`,
            date: input.visitDate,
            scope: 'company',
            status: 'scheduled',
            type: '슈퍼바이징',
            color: '#3182f6',
            details: '슈퍼바이징 방문 일정',
            created_at: new Date().toISOString()
        })
        .select('id')
        .maybeSingle<{ readonly id: string }>();
    if (error) throw error;
    return data?.id || null;
}

async function notifyVisitDue(input: {
    readonly companyId: string;
    readonly locationName: string;
    readonly purpose: string;
    readonly supervisorProfileId: string;
    readonly supabaseAdmin: SupabaseClient;
    readonly visitDate: string;
    readonly visitId: string;
}) {
    try {
        await notifyProfileRecipients({
            companyId: input.companyId,
            profileIds: [input.supervisorProfileId],
            scenarioKey: 'supervision_visit_due',
            sourceId: input.visitId,
            sourceType: 'supervision-visit-due',
            supabaseAdmin: input.supabaseAdmin,
            variables: {
                운영점명: input.locationName,
                방문일: input.visitDate,
                방문목적: input.purpose
            }
        });
    } catch (error) {
        console.warn('Supervision visit AlimTalk notification skipped:', error);
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

        const locationId = cleanString(getFirst(scope.body, ['locationId', 'location_id']));
        const visitDate = cleanString(getFirst(scope.body, ['visitDate', 'visit_date']));
        if (!locationId) return fail(400, 'VALIDATION_ERROR', '운영점을 선택해주세요.');
        if (!visitDate) return fail(400, 'VALIDATION_ERROR', '방문일을 입력해주세요.');

        const location = await fetchLocationInCompany(scope.auth.supabaseAdmin, locationId, scope.companyId);
        if (!location.ok) return location.response;
        const supervisor = await resolveProfileInCompany({
            supabaseAdmin: scope.auth.supabaseAdmin,
            rawProfileId: getFirst(scope.body, ['supervisorProfileId', 'supervisor_profile_id']),
            companyId: scope.companyId,
            message: 'SV 담당자를 선택해주세요.'
        });
        if (!supervisor.ok) return supervisor.response;
        if (!isSupervisionManager(scope.auth.requester) && supervisor.profileId !== scope.auth.requester.id) {
            return fail(403, 'FORBIDDEN', '본인 방문 일정만 등록할 수 있습니다.');
        }

        const purpose = normalizeVisitPurpose(getFirst(scope.body, ['purpose']));
        const assignmentId = await resolveAssignmentId({
            assignmentId: cleanString(getFirst(scope.body, ['assignmentId', 'assignment_id'])),
            companyId: scope.companyId,
            locationId: location.location.id,
            supervisorProfileId: supervisor.profileId,
            supabaseAdmin: scope.auth.supabaseAdmin
        });
        const scheduleId = await createSchedule({
            companyId: scope.companyId,
            locationName: location.location.name || '운영점',
            purpose,
            supervisorProfileId: supervisor.profileId,
            supabaseAdmin: scope.auth.supabaseAdmin,
            visitDate
        });

        const { data, error } = await scope.auth.supabaseAdmin
            .from('franchise_store_visits')
            .insert({
                company_id: scope.companyId,
                location_id: location.location.id,
                supervisor_profile_id: supervisor.profileId,
                assignment_id: assignmentId,
                schedule_id: scheduleId,
                visit_date: visitDate,
                purpose,
                status: normalizeVisitStatus(getFirst(scope.body, ['status'])),
                memo: cleanString(getFirst(scope.body, ['memo'])) || null,
                created_by: scope.auth.requester.id,
                updated_by: scope.auth.requester.id
            })
            .select('id')
            .single<{ readonly id: string }>();
        if (error) throw error;
        await notifyVisitDue({
            companyId: scope.companyId,
            locationName: location.location.name || '운영점',
            purpose,
            supervisorProfileId: supervisor.profileId,
            supabaseAdmin: scope.auth.supabaseAdmin,
            visitDate,
            visitId: data.id
        });
        return ok({ id: data.id }, 201);
    } catch (error) {
        if (error instanceof Error && error.message === 'SUPERVISION_ASSIGNMENT_SCOPE_MISMATCH') {
            return fail(403, 'FORBIDDEN', 'SV 배정의 회사 또는 운영점 범위가 일치하지 않습니다.');
        }
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision visit POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '방문 일정을 저장하지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const scope = await readMutationScope(request);
        if (!scope.ok) return scope.response;

        const id = cleanString(getFirst(scope.body, ['id']));
        if (!id) return fail(400, 'VALIDATION_ERROR', '방문 ID가 필요합니다.');

        const { data: existing, error: findError } = await scope.auth.supabaseAdmin
            .from('franchise_store_visits')
            .select('id, company_id, location_id, supervisor_profile_id, schedule_id, visit_date, purpose, status, created_by, location:franchise_locations(name)')
            .eq('id', id)
            .maybeSingle<VisitAccessRow>();
        if (findError) throw findError;
        if (!existing) return fail(404, 'NOT_FOUND', '방문 일정을 찾을 수 없습니다.');
        if (!canAccessSupervisorResource(scope.auth.requester, existing)) {
            return fail(403, 'FORBIDDEN', '방문 일정을 수정할 권한이 없습니다.');
        }
        const managerGuard = ensureCanManageSupervision(scope.auth.requester);
        const canChangeOwner = !managerGuard;
        const nextSupervisorRaw = getFirst(scope.body, ['supervisorProfileId', 'supervisor_profile_id']);
        const supervisorId = canChangeOwner && nextSupervisorRaw
            ? await resolveProfileInCompany({
                supabaseAdmin: scope.auth.supabaseAdmin,
                rawProfileId: nextSupervisorRaw,
                companyId: scope.companyId,
                message: 'SV 담당자를 선택해주세요.'
            })
            : null;
        if (supervisorId && !supervisorId.ok) return supervisorId.response;
        const updates: Record<string, unknown> = {
            updated_by: scope.auth.requester.id,
            updated_at: new Date().toISOString()
        };
        if (supervisorId?.ok) updates.supervisor_profile_id = supervisorId.profileId;
        const visitDate = cleanString(getFirst(scope.body, ['visitDate', 'visit_date']));
        if (visitDate) updates.visit_date = visitDate;
        const nextPurpose = Object.prototype.hasOwnProperty.call(scope.body, 'purpose')
            ? normalizeVisitPurpose(getFirst(scope.body, ['purpose']))
            : normalizeVisitPurpose(existing.purpose);
        const nextStatus = Object.prototype.hasOwnProperty.call(scope.body, 'status')
            ? normalizeVisitStatus(getFirst(scope.body, ['status']))
            : normalizeVisitStatus(existing.status);
        updates.purpose = nextPurpose;
        updates.status = nextStatus;
        if (Object.prototype.hasOwnProperty.call(scope.body, 'memo')) updates.memo = cleanString(getFirst(scope.body, ['memo'])) || null;

        const { error } = await scope.auth.supabaseAdmin
            .from('franchise_store_visits')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
        await syncSchedule({
            existing,
            nextPurpose,
            nextStatus,
            nextSupervisorProfileId: supervisorId?.ok ? supervisorId.profileId : null,
            nextVisitDate: visitDate || null,
            supabaseAdmin: scope.auth.supabaseAdmin
        });
        return ok({ success: true });
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision visit PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '방문 일정을 수정하지 못했습니다.');
    }
}
