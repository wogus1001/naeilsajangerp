import { canAccessCompanyScope, getAuthenticatedRequesterProfile, type RequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    isMissingWorkflowSchemaError,
    nextApprovalDocumentStatus,
    normalizeApprovalDocumentStatus,
    type ApprovalDocumentAction
} from '@/lib/franchise-workflow';
import {
    buildWorkflowNotification,
    completeWorkflowSchedule,
    createWorkflowNotifications,
    fetchWorkflowManagerProfileIds,
    insertApprovalDocumentEvent,
    upsertWorkflowSchedule,
    type ApprovalDocumentRow,
    type JsonRecord
} from '@/lib/franchise-workflow-store';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function canManageApprovals(requester: RequesterProfile): boolean {
    return requester.role === 'admin' || requester.role === 'manager';
}

function normalizeAction(value: unknown): ApprovalDocumentAction | null {
    const action = cleanText(value);
    if (action === 'submit' || action === 'approve' || action === 'reject' || action === 'complete' || action === 'saveDraft') return action;
    return null;
}

function canActOnDocument(requester: RequesterProfile, document: ApprovalDocumentRow, action: ApprovalDocumentAction): boolean {
    if (action === 'approve' || action === 'reject') {
        if (!canManageApprovals(requester)) return false;
        if (document.author_profile_id === requester.id) return false;
        if (requester.role !== 'admin' && document.approver_profile_id && document.approver_profile_id !== requester.id) {
            return false;
        }
        return true;
    }
    if (action === 'submit' || action === 'saveDraft' || action === 'complete') {
        return canManageApprovals(requester) || document.author_profile_id === requester.id;
    }
    return false;
}

function schemaFailure(error: unknown): Response {
    if (isMissingWorkflowSchemaError(error)) {
        return fail(500, 'INTERNAL_ERROR', '결재 액션 SQL이 아직 적용되지 않았습니다. supabase_franchise_approval_calendar_migration.sql 등록이 필요합니다.');
    }
    return fail(500, 'INTERNAL_ERROR', '결재 액션을 처리하지 못했습니다.');
}

function timestampUpdates(status: string, requesterId: string, rejectReason: string | null, now: string): JsonRecord {
    const updates: JsonRecord = {
        status,
        updated_by: requesterId,
        updated_at: now
    };
    if (status === '제출') updates.submitted_at = now;
    if (status === '승인' || status === '반려') updates.reviewed_at = now;
    if (status === '승인' || status === '반려') updates.reviewer_profile_id = requesterId;
    if (status === '완료처리') updates.completed_at = now;
    if (status === '반려') updates.reject_reason = rejectReason || '';
    if (status !== '반려') updates.reject_reason = null;
    return updates;
}

async function notifyActionResult(input: {
    readonly companyId: string;
    readonly document: ApprovalDocumentRow;
    readonly status: string;
    readonly action: ApprovalDocumentAction;
    readonly rejectReason: string | null;
}) {
    const supabaseAdmin = getSupabaseAdmin();
    if (input.status === '제출') {
        const managerIds = (await fetchWorkflowManagerProfileIds(supabaseAdmin, input.companyId))
            .filter(profileId => profileId !== input.document.author_profile_id);
        await createWorkflowNotifications(
            supabaseAdmin,
            managerIds.map(profileId => buildWorkflowNotification({
                companyId: input.companyId,
                recipientProfileId: profileId,
                sourceType: 'workflow-approval',
                sourceId: input.document.id,
                eventKey: 'submit',
                severity: 'info',
                title: '결재 요청',
                body: `${input.document.title} 문서가 승인 대기 상태입니다.`,
                actionUrl: `/schedule?approvalDocumentId=${encodeURIComponent(input.document.id)}`,
                data: { documentId: input.document.id }
            }))
        );
        await upsertWorkflowSchedule(supabaseAdmin, {
            companyId: input.companyId,
            sourceType: 'approval-document',
            sourceId: input.document.id,
            title: `결재 검토: ${input.document.title}`,
            status: '진행중',
            type: '결재',
            details: '승인 대기 문서 검토',
            managerProfileId: managerIds[0] || null,
            dueAt: new Date().toISOString(),
            metadata: { documentId: input.document.id }
        });
        return;
    }

    if (!input.document.author_profile_id) return;
    const isRejected = input.status === '반려';
    const isApproved = input.status === '승인';
    if (!isRejected && !isApproved) return;
    await createWorkflowNotifications(supabaseAdmin, [
        buildWorkflowNotification({
            companyId: input.companyId,
            recipientProfileId: input.document.author_profile_id,
            sourceType: 'workflow-approval',
            sourceId: input.document.id,
            eventKey: input.action,
            severity: isRejected ? 'warning' : 'success',
            title: isRejected ? '결재 반려' : '결재 승인 완료',
            body: isRejected
                ? `${input.document.title} 문서가 반려되었습니다.${input.rejectReason ? ` 사유: ${input.rejectReason}` : ''}`
                : `${input.document.title} 문서가 승인되었습니다.`,
            actionUrl: `/schedule?approvalDocumentId=${encodeURIComponent(input.document.id)}`,
            data: { documentId: input.document.id, rejectReason: input.rejectReason || '' }
        })
    ]);
    await completeWorkflowSchedule(supabaseAdmin, {
        companyId: input.companyId,
        sourceType: 'approval-document',
        sourceId: input.document.id
    });
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');

        const parsed: unknown = await request.json().catch(() => ({}));
        const body = isRecord(parsed) ? parsed : {};
        const documentId = cleanText(body.documentId);
        const action = normalizeAction(body.action);
        if (!documentId) return fail(400, 'VALIDATION_ERROR', '문서 ID가 필요합니다.');
        if (!action) return fail(400, 'VALIDATION_ERROR', '지원하지 않는 결재 액션입니다.');

        const { data: document, error: documentError } = await supabaseAdmin
            .from('approval_documents')
            .select('*')
            .eq('id', documentId)
            .maybeSingle<ApprovalDocumentRow>();
        if (documentError) throw documentError;
        if (!document) return fail(404, 'NOT_FOUND', '결재 문서를 찾을 수 없습니다.');
        if (!canAccessCompanyScope(requester, document.company_id)) {
            return fail(403, 'FORBIDDEN', '회사 범위가 일치하지 않습니다.');
        }
        if (!canActOnDocument(requester, document, action)) {
            return fail(403, 'FORBIDDEN', '결재 액션 권한이 없습니다.');
        }

        const rejectReason = cleanText(body.rejectReason);
        if (action === 'reject' && !rejectReason) return fail(400, 'VALIDATION_ERROR', '반려 사유가 필요합니다.');

        const transition = nextApprovalDocumentStatus(document.status, action);
        if (!transition.ok) return fail(400, 'VALIDATION_ERROR', transition.reason);

        const now = new Date().toISOString();
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('approval_documents')
            .update(timestampUpdates(transition.status, requester.id, rejectReason || null, now))
            .eq('id', document.id)
            .select('*')
            .single<ApprovalDocumentRow>();
        if (updateError || !updated) throw updateError || new Error('Approval action update failed');

        await insertApprovalDocumentEvent(supabaseAdmin, {
            companyId: document.company_id,
            documentId: document.id,
            eventType: transition.eventType,
            actorProfileId: requester.id,
            fromStatus: normalizeApprovalDocumentStatus(document.status),
            toStatus: transition.status,
            memo: rejectReason,
            data: { action }
        });

        await notifyActionResult({
            companyId: document.company_id,
            document: updated,
            status: transition.status,
            action,
            rejectReason: rejectReason || null
        });

        return ok({
            id: updated.id,
            status: normalizeApprovalDocumentStatus(updated.status),
            reviewedAt: updated.reviewed_at,
            completedAt: updated.completed_at
        });
    } catch (error) {
        console.error('Approval action error:', error);
        return schemaFailure(error);
    }
}
