import { fail, ok } from '@/lib/api-response';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    canAccessSupervisorResource,
    cleanString,
    ensureCanManageSupervision,
    getFirst,
    isMissingSupervisionSchemaError,
    isRecord,
    readJsonBody,
    resolveSupervisionAuth
} from '@/lib/franchise-supervision-api';
import {
    buildCorrectiveActionSeeds,
    mergeInspectionItems,
    nextReportStatus,
    normalizeReportStatus,
    type SupervisionPhotoAttachment,
    type SupervisionReportStatusEvent
} from '@/lib/franchise-supervision';

export const dynamic = 'force-dynamic';

type VisitRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly supervisor_profile_id: string;
    readonly created_by: string | null;
};

type ReportRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly supervisor_profile_id: string;
    readonly visit_id: string | null;
    readonly status: string | null;
    readonly inspection_items?: unknown;
    readonly photo_attachments?: unknown;
    readonly special_note?: string | null;
    readonly created_by: string | null;
};

function hasField(body: Record<string, unknown>, keys: readonly string[]): boolean {
    return keys.some(key => Object.prototype.hasOwnProperty.call(body, key));
}

function readPhotoAttachments(value: unknown): readonly SupervisionPhotoAttachment[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).map(item => ({
        name: cleanString(item.name),
        path: cleanString(item.path),
        size: Number(item.size) || 0,
        contentType: cleanString(item.contentType)
    })).filter(item => item.name && item.path);
}

function readStatusEvent(value: unknown): SupervisionReportStatusEvent {
    const event = cleanString(value);
    switch (event) {
        case 'submit':
            return { kind: 'submit' };
        case 'approve':
            return { kind: 'approve' };
        case 'reject':
            return { kind: 'reject' };
        default:
            return { kind: 'saveDraft' };
    }
}

async function fetchVisit(input: {
    readonly id: string;
    readonly supabaseAdmin: SupabaseClient;
}) {
    const { data, error } = await input.supabaseAdmin
        .from('franchise_store_visits')
        .select('id, company_id, location_id, supervisor_profile_id, created_by')
        .eq('id', input.id)
        .maybeSingle<VisitRow>();
    if (error) throw error;
    return data;
}

async function insertCorrectiveActions(input: {
    readonly assigneeProfileId: string;
    readonly companyId: string;
    readonly createdBy: string;
    readonly items: ReturnType<typeof mergeInspectionItems>;
    readonly locationId: string;
    readonly reportId: string;
    readonly supabaseAdmin: SupabaseClient;
}) {
    const seeds = buildCorrectiveActionSeeds(input.reportId, input.items);
    if (seeds.length === 0) return;
    const now = new Date().toISOString();
    const { error } = await input.supabaseAdmin
        .from('franchise_corrective_actions')
        .upsert(seeds.map(seed => ({
            company_id: input.companyId,
            report_id: input.reportId,
            inspection_item_id: seed.itemId,
            location_id: input.locationId,
            assignee_profile_id: input.assigneeProfileId,
            title: seed.title,
            memo: seed.memo || null,
            status: '요청',
            created_by: input.createdBy,
            updated_by: input.createdBy,
            created_at: now,
            updated_at: now
        })), { onConflict: 'report_id,inspection_item_id' });
    if (error) throw error;
}

export async function POST(request: Request) {
    try {
        const body = await readJsonBody(request);
        const authResult = await resolveSupervisionAuth(request);
        if (!authResult.ok) return authResult.response;

        const visitId = cleanString(getFirst(body, ['visitId', 'visit_id']));
        if (!visitId) return fail(400, 'VALIDATION_ERROR', '방문 일정을 선택해주세요.');
        const visit = await fetchVisit({ id: visitId, supabaseAdmin: authResult.auth.supabaseAdmin });
        if (!visit) return fail(404, 'NOT_FOUND', '방문 일정을 찾을 수 없습니다.');
        if (!canAccessSupervisorResource(authResult.auth.requester, visit)) {
            return fail(403, 'FORBIDDEN', '보고서를 작성할 권한이 없습니다.');
        }

        const event = readStatusEvent(getFirst(body, ['event']));
        if ((event.kind === 'approve' || event.kind === 'reject') && ensureCanManageSupervision(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '보고서를 승인하거나 반려할 권한이 없습니다.');
        }

        const items = mergeInspectionItems(getFirst(body, ['inspectionItems', 'inspection_items']));
        const nextStatus = nextReportStatus('임시저장', event);
        const now = new Date().toISOString();
        const { data, error } = await authResult.auth.supabaseAdmin
            .from('franchise_inspection_reports')
            .insert({
                company_id: visit.company_id,
                location_id: visit.location_id,
                supervisor_profile_id: visit.supervisor_profile_id,
                visit_id: visit.id,
                status: nextStatus,
                inspection_items: items,
                photo_attachments: readPhotoAttachments(getFirst(body, ['photoAttachments', 'photo_attachments'])),
                special_note: cleanString(getFirst(body, ['specialNote', 'special_note'])) || null,
                reject_reason: cleanString(getFirst(body, ['rejectReason', 'reject_reason'])) || null,
                submitted_at: nextStatus === '제출' ? now : null,
                reviewed_by: nextStatus === '승인' || nextStatus === '반려' ? authResult.auth.requester.id : null,
                reviewed_at: nextStatus === '승인' || nextStatus === '반려' ? now : null,
                created_by: authResult.auth.requester.id,
                updated_by: authResult.auth.requester.id
            })
            .select('id')
            .single<{ readonly id: string }>();
        if (error) throw error;
        if (nextStatus === '제출') {
            await insertCorrectiveActions({
                assigneeProfileId: visit.supervisor_profile_id,
                companyId: visit.company_id,
                createdBy: authResult.auth.requester.id,
                items,
                locationId: visit.location_id,
                reportId: data.id,
                supabaseAdmin: authResult.auth.supabaseAdmin
            });
        }
        return ok({ id: data.id }, 201);
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision report POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '점검 보고서를 저장하지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await readJsonBody(request);
        const authResult = await resolveSupervisionAuth(request);
        if (!authResult.ok) return authResult.response;

        const id = cleanString(getFirst(body, ['id']));
        if (!id) return fail(400, 'VALIDATION_ERROR', '보고서 ID가 필요합니다.');
        const { data: existing, error: findError } = await authResult.auth.supabaseAdmin
            .from('franchise_inspection_reports')
            .select('id, company_id, location_id, supervisor_profile_id, visit_id, status, inspection_items, photo_attachments, special_note, created_by')
            .eq('id', id)
            .maybeSingle<ReportRow>();
        if (findError) throw findError;
        if (!existing) return fail(404, 'NOT_FOUND', '점검 보고서를 찾을 수 없습니다.');
        if (!canAccessSupervisorResource(authResult.auth.requester, existing)) {
            return fail(403, 'FORBIDDEN', '보고서를 수정할 권한이 없습니다.');
        }

        const event = readStatusEvent(getFirst(body, ['event']));
        if ((event.kind === 'approve' || event.kind === 'reject') && ensureCanManageSupervision(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '보고서를 승인하거나 반려할 권한이 없습니다.');
        }

        const now = new Date().toISOString();
        const nextStatus = nextReportStatus(normalizeReportStatus(existing.status), event);
        const items = mergeInspectionItems(
            hasField(body, ['inspectionItems', 'inspection_items'])
                ? getFirst(body, ['inspectionItems', 'inspection_items'])
                : existing.inspection_items
        );
        const updates: Record<string, unknown> = {
            status: nextStatus,
            inspection_items: items,
            updated_by: authResult.auth.requester.id,
            updated_at: now
        };
        if (hasField(body, ['photoAttachments', 'photo_attachments'])) {
            updates.photo_attachments = readPhotoAttachments(getFirst(body, ['photoAttachments', 'photo_attachments']));
        }
        if (hasField(body, ['specialNote', 'special_note'])) {
            updates.special_note = cleanString(getFirst(body, ['specialNote', 'special_note'])) || null;
        }
        if (hasField(body, ['rejectReason', 'reject_reason'])) {
            updates.reject_reason = cleanString(getFirst(body, ['rejectReason', 'reject_reason'])) || null;
        }
        if (nextStatus === '제출') updates.submitted_at = now;
        if (nextStatus === '승인' || nextStatus === '반려') {
            updates.reviewed_by = authResult.auth.requester.id;
            updates.reviewed_at = now;
        }
        const { error } = await authResult.auth.supabaseAdmin
            .from('franchise_inspection_reports')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
        if (nextStatus === '제출') {
            await insertCorrectiveActions({
                assigneeProfileId: existing.supervisor_profile_id,
                companyId: existing.company_id,
                createdBy: authResult.auth.requester.id,
                items,
                locationId: existing.location_id,
                reportId: existing.id,
                supabaseAdmin: authResult.auth.supabaseAdmin
            });
        }
        return ok({ success: true });
    } catch (error) {
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision report PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '점검 보고서를 수정하지 못했습니다.');
    }
}
