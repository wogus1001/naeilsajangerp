import { fail, ok } from '@/lib/api-response';
import {
    canAccessSupervisorResource,
    cleanString,
    ensureCanManageSupervision,
    getFirst,
    isMissingSupervisionSchemaError,
    readJsonBody,
    resolveSupervisionAuth
} from '@/lib/franchise-supervision-api';
import { mergeInspectionItems, nextReportStatus, normalizeReportStatus } from '@/lib/franchise-supervision';
import {
    fetchReportTemplateItems,
    fetchVisit,
    hasField,
    insertCorrectiveActions,
    insertReportEvent,
    notifyReportReviewed,
    readPhotoAttachments,
    readStatusEvent,
    readVisitLocationName,
    reportEventTypeFor,
    syncVisitStatus,
    type ReportRow
} from './reportRouteSupport';

export const dynamic = 'force-dynamic';

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
        if (event.kind === 'approve' || event.kind === 'reject') {
            return fail(400, 'VALIDATION_ERROR', '신규 보고서는 승인 또는 반려할 수 없습니다.');
        }

        const templateId = cleanString(getFirst(body, ['templateId', 'template_id']));
        const templateItems = await fetchReportTemplateItems({
            companyId: visit.company_id,
            supabaseAdmin: authResult.auth.supabaseAdmin,
            templateId
        });
        const items = mergeInspectionItems(getFirst(body, ['inspectionItems', 'inspection_items']), templateItems);
        const nextStatus = nextReportStatus('임시저장', event);
        const eventType = reportEventTypeFor(event);
        const now = new Date().toISOString();
        const reportPayload: Record<string, unknown> = {
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
        };
        if (templateId) reportPayload.template_id = templateId;
        const { data, error } = await authResult.auth.supabaseAdmin
            .from('franchise_inspection_reports')
            .insert(reportPayload)
            .select('id')
            .single<{ readonly id: string }>();
        if (error) throw error;
        await insertReportEvent({
            actorProfileId: authResult.auth.requester.id,
            companyId: visit.company_id,
            eventType,
            memo: cleanString(getFirst(body, ['rejectReason', 'reject_reason'])) || cleanString(getFirst(body, ['specialNote', 'special_note'])),
            reportId: data.id,
            supabaseAdmin: authResult.auth.supabaseAdmin
        });
        await syncVisitStatus({
            reportEventType: eventType,
            supabaseAdmin: authResult.auth.supabaseAdmin,
            updatedBy: authResult.auth.requester.id,
            visitId: visit.id
        });
        await notifyReportReviewed({
            companyId: visit.company_id,
            eventType,
            locationName: readVisitLocationName(visit),
            reportId: data.id,
            supervisorProfileId: visit.supervisor_profile_id,
            supabaseAdmin: authResult.auth.supabaseAdmin
        });
        if (nextStatus === '제출') {
            await insertCorrectiveActions({
                assigneeProfileId: visit.supervisor_profile_id,
                companyId: visit.company_id,
                createdBy: authResult.auth.requester.id,
                items,
                locationId: visit.location_id,
                locationName: readVisitLocationName(visit),
                reportId: data.id,
                supabaseAdmin: authResult.auth.supabaseAdmin
            });
        }
        return ok({ id: data.id }, 201);
    } catch (error) {
        if (error instanceof Error && error.message === 'SUPERVISION_TEMPLATE_NOT_FOUND') {
            return fail(400, 'VALIDATION_ERROR', '점검 템플릿을 찾을 수 없습니다.');
        }
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
            .select('id, company_id, location_id, supervisor_profile_id, visit_id, status, inspection_items, photo_attachments, special_note, template_id, created_by')
            .eq('id', id)
            .maybeSingle<ReportRow>();
        if (findError) throw findError;
        if (!existing) return fail(404, 'NOT_FOUND', '점검 보고서를 찾을 수 없습니다.');
        if (!canAccessSupervisorResource(authResult.auth.requester, existing)) {
            return fail(403, 'FORBIDDEN', '보고서를 수정할 권한이 없습니다.');
        }

        const attachmentsOnly = getFirst(body, ['attachmentsOnly', 'attachments_only']) === true;
        if (attachmentsOnly) {
            const currentStatus = normalizeReportStatus(existing.status);
            if (currentStatus !== '임시저장' && currentStatus !== '제출') {
                return fail(409, 'VALIDATION_ERROR', '승인 또는 반려된 보고서의 첨부는 변경할 수 없습니다.');
            }
            const { error } = await authResult.auth.supabaseAdmin
                .from('franchise_inspection_reports')
                .update({
                    photo_attachments: readPhotoAttachments(getFirst(body, ['photoAttachments', 'photo_attachments'])),
                    updated_by: authResult.auth.requester.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);
            if (error) throw error;
            await insertReportEvent({
                actorProfileId: authResult.auth.requester.id,
                companyId: existing.company_id,
                eventType: currentStatus === '제출' ? '제출' : '임시저장',
                memo: '첨부 사진 변경',
                reportId: existing.id,
                supabaseAdmin: authResult.auth.supabaseAdmin
            });
            return ok({ success: true });
        }
        const event = readStatusEvent(getFirst(body, ['event']));
        if ((event.kind === 'approve' || event.kind === 'reject') && ensureCanManageSupervision(authResult.auth.requester)) {
            return fail(403, 'FORBIDDEN', '보고서를 승인하거나 반려할 권한이 없습니다.');
        }

        const now = new Date().toISOString();
        const currentStatus = normalizeReportStatus(existing.status);
        const nextStatus = nextReportStatus(currentStatus, event);
        if (nextStatus === currentStatus && event.kind !== 'saveDraft') {
            return fail(409, 'VALIDATION_ERROR', '현재 보고서 상태에서는 요청한 처리를 할 수 없습니다.');
        }
        if (nextStatus === currentStatus && event.kind === 'saveDraft' && currentStatus !== '임시저장') {
            return fail(409, 'VALIDATION_ERROR', '현재 보고서 상태에서는 임시저장할 수 없습니다.');
        }
        const eventType = reportEventTypeFor(event);
        const canEditContent = event.kind === 'saveDraft' || event.kind === 'submit';
        const nextTemplateId = canEditContent
            ? cleanString(getFirst(body, ['templateId', 'template_id'])) || existing.template_id || ''
            : existing.template_id || '';
        const templateItems = canEditContent
            ? await fetchReportTemplateItems({
                companyId: existing.company_id,
                supabaseAdmin: authResult.auth.supabaseAdmin,
                templateId: nextTemplateId
            })
            : [];
        const items = canEditContent
            ? mergeInspectionItems(
                hasField(body, ['inspectionItems', 'inspection_items'])
                    ? getFirst(body, ['inspectionItems', 'inspection_items'])
                    : existing.inspection_items,
                templateItems
            )
            : mergeInspectionItems(existing.inspection_items);
        const updates: Record<string, unknown> = {
            status: nextStatus,
            updated_by: authResult.auth.requester.id,
            updated_at: now
        };
        if (canEditContent) updates.inspection_items = items;
        if (canEditContent && nextTemplateId) updates.template_id = nextTemplateId;
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
        await insertReportEvent({
            actorProfileId: authResult.auth.requester.id,
            companyId: existing.company_id,
            eventType,
            memo: cleanString(getFirst(body, ['rejectReason', 'reject_reason'])) || cleanString(getFirst(body, ['specialNote', 'special_note'])),
            reportId: existing.id,
            supabaseAdmin: authResult.auth.supabaseAdmin
        });
        await syncVisitStatus({
            reportEventType: eventType,
            supabaseAdmin: authResult.auth.supabaseAdmin,
            updatedBy: authResult.auth.requester.id,
            visitId: existing.visit_id
        });
        const visit = existing.visit_id
            ? await fetchVisit({ id: existing.visit_id, supabaseAdmin: authResult.auth.supabaseAdmin })
            : null;
        await notifyReportReviewed({
            companyId: existing.company_id,
            eventType,
            locationName: readVisitLocationName(visit),
            reportId: existing.id,
            supervisorProfileId: existing.supervisor_profile_id,
            supabaseAdmin: authResult.auth.supabaseAdmin
        });
        if (nextStatus === '제출') {
            await insertCorrectiveActions({
                assigneeProfileId: existing.supervisor_profile_id,
                companyId: existing.company_id,
                createdBy: authResult.auth.requester.id,
                items,
                locationId: existing.location_id,
                locationName: readVisitLocationName(visit),
                reportId: existing.id,
                supabaseAdmin: authResult.auth.supabaseAdmin
            });
        }
        return ok({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === 'SUPERVISION_TEMPLATE_NOT_FOUND') {
            return fail(400, 'VALIDATION_ERROR', '점검 템플릿을 찾을 수 없습니다.');
        }
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise supervision report PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '점검 보고서를 수정하지 못했습니다.');
    }
}
