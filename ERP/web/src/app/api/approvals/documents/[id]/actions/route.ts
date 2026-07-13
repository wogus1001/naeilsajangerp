import { fail, ok } from '@/lib/api-response';
import { resolveApprovalContext } from '../../../_shared/access';
import {
    hasOwn,
    parseAction,
    parseOptionalText,
    parseRecord,
    parseRequiredText,
    parseRequiredUuid,
    readJsonRecord
} from '../../../_shared/boundary';
import {
    DOCUMENT_SELECT,
    documentView,
    receiverIds,
    type ApprovalDocumentRow
} from '../../../_shared/documents';
import { approvalErrorResponse, throwDatabaseError } from '../../../_shared/errors';
import { requireVisibleApprovalDocument } from '../../../_shared/visibility';
import { missingRequiredApprovalFields } from '../../../_shared/submission';

export const dynamic = 'force-dynamic';

type RouteContext = { readonly params: Promise<{ readonly id: string }> };
type ActionRouteDependencies = {
    readonly resolveContext: typeof resolveApprovalContext;
};

const defaultDependencies: ActionRouteDependencies = { resolveContext: resolveApprovalContext };

async function documentForAction(
    context: Awaited<ReturnType<typeof resolveApprovalContext>>,
    id: string
): Promise<ApprovalDocumentRow | null> {
    const { data, error } = await context.supabase
        .from('approval_documents')
        .select(DOCUMENT_SELECT)
        .eq('id', id)
        .eq('company_id', context.companyId)
        .maybeSingle<ApprovalDocumentRow>();
    throwDatabaseError(error);
    return requireVisibleApprovalDocument(context, data);
}

async function saveDraft(
    context: Awaited<ReturnType<typeof resolveApprovalContext>>,
    document: ApprovalDocumentRow,
    body: Record<string, unknown>
) {
    if (document.author_profile_id !== context.requester.id) {
        return fail(403, 'FORBIDDEN', 'Only the document author can save this draft');
    }
    if (!['임시저장', '반려', '회수'].includes(document.status)) {
        return fail(409, 'CONFLICT', 'Submitted approval documents cannot be saved as a draft');
    }
    const updates: Record<string, unknown> = {
        updated_by: context.requester.id,
        updated_at: new Date().toISOString()
    };
    if (hasOwn(body, 'title')) updates.title = parseRequiredText(body.title, 'title', 200);
    if (hasOwn(body, 'values')) updates.values = parseRecord(body.values, 'values');
    if (hasOwn(body, 'body')) {
        const receivers = receiverIds(document.data);
        updates.data = {
            ...parseRecord(body.body, 'body'),
            receiver_unit_ids: receivers.unitIds,
            receiver_profile_ids: receivers.profileIds
        };
    }
    const { data, error } = await context.supabase
        .from('approval_documents')
        .update(updates)
        .eq('id', document.id)
        .eq('company_id', context.companyId)
        .select(DOCUMENT_SELECT)
        .single<ApprovalDocumentRow>();
    throwDatabaseError(error);
    return data ? ok({ document: documentView(data), action: 'saveDraft' }) : fail(404, 'NOT_FOUND', 'Approval document not found');
}

export async function handleApprovalActionPOST(
    request: Request,
    routeContext: RouteContext,
    dependencies: ActionRouteDependencies = defaultDependencies
) {
    try {
        const body = await readJsonRecord(request);
        const context = await dependencies.resolveContext(request, body);
        const id = parseRequiredUuid((await routeContext.params).id, 'id');
        const action = parseAction(body.action);
        const document = await documentForAction(context, id);
        if (!document) return fail(404, 'NOT_FOUND', 'Approval document not found');
        if (action === 'saveDraft') return saveDraft(context, document, body);
        const memo = parseOptionalText(body.reason ?? body.memo, 'memo', 2_000);
        if (action === 'reject' && !memo) {
            return fail(400, 'VALIDATION_ERROR', 'A rejection reason is required');
        }
        if (action === 'submit' && document.template_id) {
            const { data: template, error: templateError } = await context.supabase
                .from('approval_templates')
                .select('current_version_id')
                .eq('id', document.template_id)
                .eq('company_id', context.companyId)
                .maybeSingle<{ readonly current_version_id: string | null }>();
            throwDatabaseError(templateError);
            const { data: version, error: versionError } = template?.current_version_id
                ? await context.supabase
                    .from('approval_template_versions')
                    .select('fields')
                    .eq('id', template.current_version_id)
                    .eq('company_id', context.companyId)
                    .maybeSingle<{ readonly fields: unknown }>()
                : { data: null, error: null };
            throwDatabaseError(versionError);
            const missing = missingRequiredApprovalFields(version?.fields, document.values);
            if (missing.length > 0) {
                return fail(400, 'VALIDATION_ERROR', `${missing[0]} 항목을 입력해 주세요.`);
            }
        }
        if (action === 'approve' && document.author_profile_id === context.requester.id) {
            return fail(403, 'FORBIDDEN', 'Self approval is not allowed');
        }
        const { data, error } = await context.supabase.rpc('perform_approval_document_action', {
            p_document_id: id,
            p_company_id: context.companyId,
            p_action: action,
            p_actor_profile_id: context.requester.id,
            p_memo: memo
        });
        throwDatabaseError(error);
        return ok({ action, result: data });
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to perform approval document action');
    }
}

export async function POST(request: Request, routeContext: RouteContext) {
    return handleApprovalActionPOST(request, routeContext);
}
