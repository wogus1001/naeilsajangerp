import { fail, ok } from '@/lib/api-response';
import { randomUUID } from 'crypto';
import { isMissingWorkflowSchemaError } from '@/lib/franchise-workflow';
import {
    canAccessSupervisorResource,
    cleanString,
    ensureCanManageSupervision,
    getFirst,
    isRecord,
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
    notifyReportReviewed,
    reconcileSubmittedSupervisionReport,
    readPhotoAttachments,
    readStatusEvent,
    readVisitLocationName,
    reportEventTypeFor,
    syncSupervisionReportWorkflow,
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
        const reportId = randomUUID();
        const photoAttachments = readPhotoAttachments(
            getFirst(body, ['photoAttachments', 'photo_attachments']),
            { companyId: visit.company_id, reportId }
        );
        const specialNote = cleanString(getFirst(body, ['specialNote', 'special_note'])) || null;
        const rejectReason = cleanString(getFirst(body, ['rejectReason', 'reject_reason'])) || null;
        const workflowSync = await syncSupervisionReportWorkflow({
            actorProfileId: authResult.auth.requester.id,
            companyId: visit.company_id,
            eventType,
            locationName: readVisitLocationName(visit),
            reportId,
            rejectReason,
            specialNote,
            supervisorProfileId: visit.supervisor_profile_id,
            supabaseAdmin: authResult.auth.supabaseAdmin,
            templateId,
            visitId: visit.id,
            reportWrite: {
                create: true,
                inspectionItems: items,
                locationId: visit.location_id,
                photoAttachments,
                reviewedAt: null,
                reviewedBy: null,
                status: nextStatus,
                submittedAt: nextStatus === '제출' ? now : null
            }
        });
        await notifyReportReviewed({
            companyId: visit.company_id,
            eventType,
            locationName: readVisitLocationName(visit),
            reportId,
            supervisorProfileId: visit.supervisor_profile_id,
            supabaseAdmin: authResult.auth.supabaseAdmin
        });
        const correctiveSync = nextStatus === '제출'
            ? await insertCorrectiveActions({
                assigneeProfileId: visit.supervisor_profile_id,
                companyId: visit.company_id,
                createdBy: authResult.auth.requester.id,
                items,
                locationId: visit.location_id,
                locationName: readVisitLocationName(visit),
                reportId,
                supabaseAdmin: authResult.auth.supabaseAdmin
            })
            : { scheduleSyncRequiredCount: 0 };
        return ok({
            id: reportId,
            scheduleSyncRequired: workflowSync.status === 'failed'
                || correctiveSync.scheduleSyncRequiredCount > 0
        }, 201);
    } catch (error) {
        if (error instanceof Error && error.message === 'SUPERVISION_TEMPLATE_NOT_FOUND') {
            return fail(400, 'VALIDATION_ERROR', '점검 템플릿을 찾을 수 없습니다.');
        }
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        if (isMissingWorkflowSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '전자결재 SQL이 아직 적용되지 않았습니다. supabase_company_approvals_v2_migration.sql 적용 후 다시 확인해주세요.');
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
            .select('id, company_id, location_id, supervisor_profile_id, visit_id, status, inspection_items, photo_attachments, special_note, reject_reason, template_id, submitted_at, reviewed_by, reviewed_at, created_by, updated_by, updated_at')
            .eq('id', id)
            .maybeSingle<ReportRow>();
        if (findError) throw findError;
        if (!existing) return fail(404, 'NOT_FOUND', '점검 보고서를 찾을 수 없습니다.');
        if (!canAccessSupervisorResource(authResult.auth.requester, existing)) {
            return fail(403, 'FORBIDDEN', '보고서를 수정할 권한이 없습니다.');
        }

        const attachmentsOnly = getFirst(body, ['attachmentsOnly', 'attachments_only']) === true;
        if (attachmentsOnly) {
            return fail(409, 'CONFLICT', '첨부 저장 방식이 변경되었습니다. 화면을 새로고침한 뒤 다시 저장해주세요.');
        }
        const event = readStatusEvent(getFirst(body, ['event']));
        if (event.kind === 'approve' || event.kind === 'reject') {
            const managerGuard = ensureCanManageSupervision(authResult.auth.requester);
            if (managerGuard) return managerGuard;
        }
        const canEditContent = event.kind === 'saveDraft' || event.kind === 'submit';
        if (canEditContent && existing.created_by !== authResult.auth.requester.id) {
            return fail(403, 'FORBIDDEN', '보고서 작성자만 임시저장하거나 제출할 수 있습니다.');
        }

        const now = new Date().toISOString();
        const currentStatus = normalizeReportStatus(existing.status);
        const nextStatus = nextReportStatus(currentStatus, event);
        const duplicateSubmit = nextStatus === currentStatus && event.kind === 'submit' && currentStatus === '제출';
        if (duplicateSubmit) {
            const visit = existing.visit_id
                ? await fetchVisit({ id: existing.visit_id, supabaseAdmin: authResult.auth.supabaseAdmin })
                : null;
            const workflowSync = await reconcileSubmittedSupervisionReport({
                actorProfileId: authResult.auth.requester.id,
                report: existing,
                supabaseAdmin: authResult.auth.supabaseAdmin,
                visit
            });
            const correctiveSync = await insertCorrectiveActions({
                assigneeProfileId: existing.supervisor_profile_id,
                companyId: existing.company_id,
                createdBy: authResult.auth.requester.id,
                items: mergeInspectionItems(existing.inspection_items),
                locationId: existing.location_id,
                locationName: readVisitLocationName(visit),
                reportId: existing.id,
                supabaseAdmin: authResult.auth.supabaseAdmin
            });
            return ok({
                success: true,
                id: existing.id,
                status: currentStatus,
                scheduleSyncRequired: workflowSync.status === 'failed'
                    || correctiveSync.scheduleSyncRequiredCount > 0
            });
        }
        if (nextStatus === currentStatus && event.kind !== 'saveDraft') {
            return fail(409, 'VALIDATION_ERROR', '현재 보고서 상태에서는 요청한 처리를 할 수 없습니다.');
        }
        if (nextStatus === currentStatus && event.kind === 'saveDraft' && currentStatus !== '임시저장') {
            return fail(409, 'VALIDATION_ERROR', '현재 보고서 상태에서는 임시저장할 수 없습니다.');
        }
        const eventType = reportEventTypeFor(event);
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
        const photoAttachments = canEditContent && hasField(body, ['photoAttachments', 'photo_attachments'])
            ? readPhotoAttachments(
                getFirst(body, ['photoAttachments', 'photo_attachments']),
                { companyId: existing.company_id, reportId: existing.id }
            )
            : existing.photo_attachments;
        const specialNote = canEditContent && hasField(body, ['specialNote', 'special_note'])
            ? cleanString(getFirst(body, ['specialNote', 'special_note'])) || null
            : existing.special_note || null;
        const rejectReason = hasField(body, ['rejectReason', 'reject_reason'])
            ? cleanString(getFirst(body, ['rejectReason', 'reject_reason'])) || null
            : existing.reject_reason || null;
        const reviewed = nextStatus === '승인' || nextStatus === '반려';
        const visit = existing.visit_id
            ? await fetchVisit({ id: existing.visit_id, supabaseAdmin: authResult.auth.supabaseAdmin })
            : null;
        const workflowSync = await syncSupervisionReportWorkflow({
            actorProfileId: authResult.auth.requester.id,
            companyId: existing.company_id,
            eventType,
            locationName: readVisitLocationName(visit),
            reportId: existing.id,
            rejectReason,
            specialNote,
            supervisorProfileId: existing.supervisor_profile_id,
            supabaseAdmin: authResult.auth.supabaseAdmin,
            templateId: nextTemplateId,
            visitId: existing.visit_id,
            reportWrite: {
                create: false,
                expectedUpdatedAt: existing.updated_at,
                inspectionItems: items,
                locationId: existing.location_id,
                photoAttachments,
                reviewedAt: reviewed ? now : existing.reviewed_at || null,
                reviewedBy: reviewed ? authResult.auth.requester.id : existing.reviewed_by || null,
                status: nextStatus,
                submittedAt: nextStatus === '제출' ? existing.submitted_at || now : existing.submitted_at || null
            }
        });
        await notifyReportReviewed({
            companyId: existing.company_id,
            eventType,
            locationName: readVisitLocationName(visit),
            reportId: existing.id,
            supervisorProfileId: existing.supervisor_profile_id,
            supabaseAdmin: authResult.auth.supabaseAdmin
        });
        const correctiveSync = nextStatus === '제출'
            ? await insertCorrectiveActions({
                assigneeProfileId: existing.supervisor_profile_id,
                companyId: existing.company_id,
                createdBy: authResult.auth.requester.id,
                items,
                locationId: existing.location_id,
                locationName: readVisitLocationName(visit),
                reportId: existing.id,
                supabaseAdmin: authResult.auth.supabaseAdmin
            })
            : { scheduleSyncRequiredCount: 0 };
        return ok({
            success: true,
            scheduleSyncRequired: workflowSync.status === 'failed'
                || correctiveSync.scheduleSyncRequiredCount > 0
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'SUPERVISION_TEMPLATE_NOT_FOUND') {
            return fail(400, 'VALIDATION_ERROR', '점검 템플릿을 찾을 수 없습니다.');
        }
        if (isMissingSupervisionSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '슈퍼바이징 SQL이 아직 적용되지 않았습니다. supabase_franchise_supervision_migration.sql 적용 후 다시 확인해주세요.');
        }
        if (isMissingWorkflowSchemaError(error)) {
            return fail(424, 'VALIDATION_ERROR', '전자결재 SQL이 아직 적용되지 않았습니다. supabase_company_approvals_v2_migration.sql 적용 후 다시 확인해주세요.');
        }
        if (isRecord(error) && error.code === '40001') {
            return fail(409, 'CONFLICT', '보고서가 다른 화면에서 변경되었습니다. 새로고침 후 다시 처리해주세요.');
        }
        if (isRecord(error) && error.code === '42501') {
            return fail(403, 'FORBIDDEN', '현재 결재 단계 담당자만 보고서를 승인하거나 반려할 수 있습니다.');
        }
        console.error('Franchise supervision report PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '점검 보고서를 수정하지 못했습니다.');
    }
}
