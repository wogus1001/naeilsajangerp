import { fail, ok } from '@/lib/api-response';
import { resolveApprovalContext } from '../_shared/access';
import {
    parseOptionalText,
    parseOptionalUuid,
    parsePageQuery,
    readJsonRecord
} from '../_shared/boundary';
import {
    DOCUMENT_SELECT,
    documentView,
    parseDocumentDraft,
    rawDocumentStatus,
    type ApprovalDocumentRow
} from '../_shared/documents';
import { approvalErrorResponse, ApprovalRouteError, throwDatabaseError } from '../_shared/errors';
import { validateDocumentReferences } from '../_shared/document-references';
import { visibleApprovalDocuments } from '../_shared/visibility';
import { approvalDocumentViews } from '../_shared/presentation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const context = await resolveApprovalContext(request);
        const { searchParams } = new URL(request.url);
        const pagination = parsePageQuery(searchParams);
        let query = context.supabase
            .from('approval_documents')
            .select(DOCUMENT_SELECT)
            .eq('company_id', context.companyId)
            .order('updated_at', { ascending: false });
        const templateId = parseOptionalUuid(searchParams.get('templateId'), 'templateId');
        if (templateId) query = query.eq('template_id', templateId);
        const status = parseOptionalText(searchParams.get('status'), 'status', 20);
        if (status) {
            const rawStatus = rawDocumentStatus(status);
            if (!rawStatus) return fail(400, 'VALIDATION_ERROR', 'status is not supported');
            query = query.eq('status', rawStatus);
        }
        const { data, error } = await query.returns<ApprovalDocumentRow[]>();
        throwDatabaseError(error);
        const visible = await visibleApprovalDocuments(context, data || []);
        const offset = (pagination.page - 1) * pagination.pageSize;
        const pageDocuments = visible.slice(offset, offset + pagination.pageSize);
        return ok({
            documents: await approvalDocumentViews(context, pageDocuments),
            pagination: {
                page: pagination.page,
                pageSize: pagination.pageSize,
                total: visible.length,
                totalPages: Math.ceil(visible.length / pagination.pageSize)
            }
        });
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to load approval documents');
    }
}

export async function POST(request: Request) {
    try {
        const body = await readJsonRecord(request);
        const context = await resolveApprovalContext(request, body);
        const draft = parseDocumentDraft(body);
        if (draft.source_type || draft.source_id) {
            return fail(403, 'FORBIDDEN', '원천 연결 결재 문서는 내부 연동에서만 생성할 수 있습니다.');
        }
        if (!draft.template_id && !draft.approver_profile_id) {
            return fail(400, 'VALIDATION_ERROR', 'templateId or approverProfileId is required');
        }
        await validateDocumentReferences(context, draft);
        const now = new Date().toISOString();
        const { readerProfileIds, ...documentDraft } = draft;
        const { data, error } = await context.supabase
            .from('approval_documents')
            .insert({
                ...documentDraft,
                company_id: context.companyId,
                status: '임시저장',
                author_profile_id: context.requester.id,
                created_by: context.requester.id,
                updated_by: context.requester.id,
                created_at: now,
                updated_at: now
            })
            .select(DOCUMENT_SELECT)
            .single<ApprovalDocumentRow>();
        throwDatabaseError(error);
        if (!data) throw new ApprovalRouteError(500, 'INTERNAL_ERROR', 'Approval document was not returned');
        if (readerProfileIds.length > 0) {
            const { error: readerError } = await context.supabase
                .from('approval_document_readers')
                .insert(readerProfileIds.map(profileId => ({
                    company_id: context.companyId,
                    document_id: data.id,
                    profile_id: profileId,
                    granted_by: context.requester.id
                })));
            if (readerError) {
                const { error: cleanupError } = await context.supabase
                    .from('approval_documents')
                    .delete()
                    .eq('id', data.id)
                    .eq('company_id', context.companyId);
                throwDatabaseError(cleanupError || readerError);
            }
        }
        return ok({ document: documentView(data) }, 201);
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to create approval document');
    }
}
