import { canAccessCompanyScope, getAuthenticatedRequesterProfile, type RequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    isMissingWorkflowSchemaError,
    normalizeApprovalDocumentStatus,
    type ApprovalDocumentAction
} from '@/lib/franchise-workflow';
import { type ApprovalDocumentRow, type JsonRecord } from '@/lib/franchise-workflow-store';
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

        if (action === 'saveDraft') {
            if (!['임시저장', '반려', '회수'].includes(document.status)) {
                return fail(409, 'CONFLICT', '제출된 결재 문서는 임시저장할 수 없습니다.');
            }
            const { error: draftError } = await supabaseAdmin.from('approval_documents')
                .update({ updated_by: requester.id, updated_at: new Date().toISOString() })
                .eq('id', document.id).eq('company_id', document.company_id);
            if (draftError) throw draftError;
        } else {
            const { error: actionError } = await supabaseAdmin.rpc('perform_approval_document_action', {
                p_document_id: document.id,
                p_company_id: document.company_id,
                p_action: action,
                p_actor_profile_id: requester.id,
                p_memo: rejectReason
            });
            if (actionError) throw actionError;
        }

        const { data: updated, error: updatedError } = await supabaseAdmin.from('approval_documents')
            .select('*').eq('id', document.id).eq('company_id', document.company_id)
            .single<ApprovalDocumentRow>();
        if (updatedError || !updated) throw updatedError || new TypeError('결재 처리 결과를 확인할 수 없습니다.');

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
