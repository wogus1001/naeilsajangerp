import {
    canAccessCompanyScope,
    getAuthenticatedRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    type RequesterProfile
} from '@/lib/api-auth';
import { randomUUID } from 'crypto';
import { fail, ok } from '@/lib/api-response';
import {
    isMissingWorkflowSchemaError,
    nextApprovalDocumentStatus,
    normalizeApprovalDocumentStatus,
    type ApprovalDocumentAction
} from '@/lib/franchise-workflow';
import {
    fetchWorkflowManagerProfileIds,
    insertApprovalDocumentEvent,
    upsertApprovalDocumentForSource,
    type ApprovalDocumentEventRow,
    type ApprovalDocumentRow,
    type JsonRecord
} from '@/lib/franchise-workflow-store';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type ProfileCompanyRow = {
    readonly company_id: string | null;
    readonly role: string | null;
    readonly status: string | null;
};

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function canManageApprovals(requester: RequesterProfile): boolean {
    return requester.role === 'admin';
}

function recordOrEmpty(value: unknown): JsonRecord {
    return isRecord(value) ? value : {};
}

function normalizeAction(value: unknown): ApprovalDocumentAction {
    const action = cleanText(value);
    if (action === 'submit' || action === 'approve' || action === 'reject' || action === 'complete') return action;
    return 'saveDraft';
}

function transformDocument(row: ApprovalDocumentRow, events: readonly ApprovalDocumentEventRow[] = []) {
    return {
        id: row.id,
        companyId: row.company_id,
        templateId: row.template_id,
        sourceType: row.source_type || '',
        sourceId: row.source_id || '',
        title: row.title,
        status: normalizeApprovalDocumentStatus(row.status),
        authorProfileId: row.author_profile_id,
        approverProfileId: row.approver_profile_id,
        reviewerProfileId: row.reviewer_profile_id,
        values: recordOrEmpty(row.values),
        rejectReason: row.reject_reason || '',
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        completedAt: row.completed_at,
        data: recordOrEmpty(row.data),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        events: events.map(event => ({
            id: event.id,
            eventType: event.event_type,
            actorProfileId: event.actor_profile_id,
            fromStatus: event.from_status,
            toStatus: event.to_status,
            memo: event.memo,
            data: recordOrEmpty(event.data),
            createdAt: event.created_at
        }))
    };
}

async function resolveCompanyId(
    request: Request,
    requester: RequesterProfile,
    body?: JsonRecord
): Promise<string | null> {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const companyIdInput = cleanText(body?.companyId) || searchParams.get('companyId') || '';
    const companyNameInput = cleanText(body?.companyName) || searchParams.get('company') || '';
    const companyIdByName = companyNameInput ? await resolveCompanyIdByName(supabaseAdmin, companyNameInput) : null;
    return isAdmin(requester) ? companyIdInput || companyIdByName || requester.company_id : requester.company_id;
}

function schemaFailure(error: unknown): Response {
    if (isMissingWorkflowSchemaError(error)) {
        return fail(500, 'INTERNAL_ERROR', '결재 문서 SQL이 아직 적용되지 않았습니다. supabase_company_approvals_v2_migration.sql 등록이 필요합니다.');
    }
    return fail(500, 'INTERNAL_ERROR', '결재 문서를 처리하지 못했습니다.');
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');

        const companyId = await resolveCompanyId(request, requester);
        if (!companyId) return fail(400, 'VALIDATION_ERROR', '회사 정보가 필요합니다.');
        if (!canAccessCompanyScope(requester, companyId)) return fail(403, 'FORBIDDEN', '결재 문서 접근 권한이 없습니다.');

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id') || '';
        if (id) {
            const { data: document, error } = await supabaseAdmin
                .from('approval_documents')
                .select('*')
                .eq('id', id)
                .maybeSingle<ApprovalDocumentRow>();
            if (error) throw error;
            if (!document) return fail(404, 'NOT_FOUND', '결재 문서를 찾을 수 없습니다.');
            if (!canAccessCompanyScope(requester, document.company_id)) return fail(403, 'FORBIDDEN', '결재 문서 접근 권한이 없습니다.');
            if (!canManageApprovals(requester) && document.author_profile_id !== requester.id && document.approver_profile_id !== requester.id) {
                return fail(403, 'FORBIDDEN', '결재 문서 접근 권한이 없습니다.');
            }
            const { data: events, error: eventsError } = await supabaseAdmin
                .from('approval_document_events')
                .select('*')
                .eq('document_id', id)
                .order('created_at', { ascending: true })
                .returns<ApprovalDocumentEventRow[]>();
            if (eventsError) throw eventsError;
            return ok(transformDocument(document, events || []));
        }

        let query = supabaseAdmin
            .from('approval_documents')
            .select('*')
            .eq('company_id', companyId)
            .order('updated_at', { ascending: false });
        const status = searchParams.get('status') || '';
        const sourceType = searchParams.get('sourceType') || '';
        if (status) query = query.eq('status', status);
        if (sourceType) query = query.eq('source_type', sourceType);
        if (!canManageApprovals(requester)) query = query.or(`author_profile_id.eq.${requester.id},approver_profile_id.eq.${requester.id}`);

        const { data, error } = await query.returns<ApprovalDocumentRow[]>();
        if (error) throw error;
        return ok((data || []).map(row => transformDocument(row)));
    } catch (error) {
        console.error('Approval documents GET error:', error);
        return schemaFailure(error);
    }
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');

        const parsed: unknown = await request.json().catch(() => ({}));
        const body = isRecord(parsed) ? parsed : {};
        const companyId = await resolveCompanyId(request, requester, body);
        if (!companyId) return fail(400, 'VALIDATION_ERROR', '회사 정보가 필요합니다.');
        if (!canAccessCompanyScope(requester, companyId)) return fail(403, 'FORBIDDEN', '결재 문서 작성 권한이 없습니다.');

        const title = cleanText(body.title);
        if (!title) return fail(400, 'VALIDATION_ERROR', '문서명이 필요합니다.');

        const action = normalizeAction(body.action);
        const transition = nextApprovalDocumentStatus('임시저장', action);
        if (!transition.ok) return fail(400, 'VALIDATION_ERROR', transition.reason);

        const requestedSourceType = cleanText(body.sourceType);
        const requestedSourceId = cleanText(body.sourceId);
        if (requestedSourceType && requestedSourceType !== 'manual-approval') {
            return fail(403, 'FORBIDDEN', '원천 연결 결재 문서는 내부 연동에서만 생성할 수 있습니다.');
        }
        if (requestedSourceId) {
            return fail(403, 'FORBIDDEN', '결재 문서 원천 ID는 서버에서 생성합니다.');
        }

        const sourceId = randomUUID();
        const sourceType = 'manual-approval';
        const requestedAuthorProfileId = cleanText(body.authorProfileId);
        if (requestedAuthorProfileId && requestedAuthorProfileId !== requester.id) {
            return fail(403, 'FORBIDDEN', '다른 작성자로 결재 문서를 작성할 권한이 없습니다.');
        }

        const authorProfileId = requestedAuthorProfileId || requester.id;
        const { data: authorProfile, error: authorProfileError } = await supabaseAdmin
            .from('profiles')
            .select('company_id, role, status')
            .eq('id', authorProfileId)
            .maybeSingle<ProfileCompanyRow>();
        if (authorProfileError) throw authorProfileError;
        if (!authorProfile || authorProfile.company_id !== companyId || authorProfile.status !== 'active') {
            return fail(403, 'FORBIDDEN', '작성자 회사 범위가 일치하지 않습니다.');
        }

        const requestedApproverProfileId = cleanText(body.approverProfileId);
        if (requestedApproverProfileId && !canManageApprovals(requester)) {
            return fail(403, 'FORBIDDEN', '결재자를 지정할 권한이 없습니다.');
        }

        const managerProfileIds = transition.status === '제출'
            ? (await fetchWorkflowManagerProfileIds(supabaseAdmin, companyId)).filter(profileId => profileId !== authorProfileId)
            : [];
        const approverProfileId = requestedApproverProfileId || managerProfileIds[0] || null;
        if (transition.status === '제출' && !approverProfileId) {
            return fail(400, 'VALIDATION_ERROR', '결재 요청을 받을 회사 팀장을 먼저 등록해 주세요.');
        }
        if (approverProfileId && approverProfileId === authorProfileId) {
            return fail(400, 'VALIDATION_ERROR', '작성자와 결재자는 달라야 합니다.');
        }
        if (approverProfileId) {
            const { data: approverProfile, error: approverProfileError } = await supabaseAdmin
                .from('profiles')
                .select('company_id, role, status')
                .eq('id', approverProfileId)
                .maybeSingle<ProfileCompanyRow>();
            if (approverProfileError) throw approverProfileError;
            if (
                !approverProfile ||
                approverProfile.company_id !== companyId ||
                approverProfile.status !== 'active' ||
                (approverProfile.role !== 'admin' && approverProfile.role !== 'manager')
            ) {
                return fail(403, 'FORBIDDEN', '결재자 회사 범위가 일치하지 않습니다.');
            }
        }

        const document = await upsertApprovalDocumentForSource(supabaseAdmin, {
            companyId,
            templateId: cleanText(body.templateId) || null,
            sourceType,
            sourceId,
            title,
            status: transition.status === '제출' ? '임시저장' : transition.status,
            authorProfileId,
            approverProfileId,
            values: recordOrEmpty(body.values),
            data: recordOrEmpty(body.data),
            actorProfileId: requester.id
        });
        if (transition.status === '제출') {
            const { error: actionError } = await supabaseAdmin.rpc('perform_approval_document_action', {
                p_document_id: document.id,
                p_company_id: companyId,
                p_action: 'submit',
                p_actor_profile_id: requester.id,
                p_memo: ''
            });
            if (actionError) {
                const { error: cleanupError } = await supabaseAdmin.from('approval_documents')
                    .delete().eq('id', document.id).eq('company_id', companyId);
                throw cleanupError || actionError;
            }
        } else {
            await insertApprovalDocumentEvent(supabaseAdmin, {
                companyId,
                documentId: document.id,
                eventType: transition.eventType,
                actorProfileId: requester.id,
                fromStatus: null,
                toStatus: transition.status,
                data: { sourceType, sourceId }
            });
        }

        const { data: savedDocument, error: savedError } = await supabaseAdmin.from('approval_documents')
            .select('*').eq('id', document.id).eq('company_id', companyId)
            .single<ApprovalDocumentRow>();
        if (savedError || !savedDocument) throw savedError || new TypeError('결재 문서 저장 결과를 확인할 수 없습니다.');
        return ok(transformDocument(savedDocument), 201);
    } catch (error) {
        console.error('Approval documents POST error:', error);
        return schemaFailure(error);
    }
}
