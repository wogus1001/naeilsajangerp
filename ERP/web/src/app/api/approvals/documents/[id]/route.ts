import { fail, ok } from '@/lib/api-response';
import { resolveApprovalContext } from '../../_shared/access';
import {
    hasOwn,
    isRecord,
    parseRequiredUuid,
    readJsonRecord,
    type JsonRecord
} from '../../_shared/boundary';
import {
    DOCUMENT_EVENT_SELECT,
    DOCUMENT_READER_SELECT,
    DOCUMENT_SELECT,
    DOCUMENT_STEP_SELECT,
    DOCUMENT_VERSION_SELECT,
    actorAppearsInTargets,
    actorAlreadyResponded,
    documentView,
    hasProtectedDocumentSourceFields,
    parseDocumentDraft,
    receiverIds,
    type ApprovalDocumentEventRow,
    type ApprovalDocumentReaderRow,
    type ApprovalDocumentRow,
    type ApprovalDocumentStepRow,
    type ApprovalDocumentVersionRow
} from '../../_shared/documents';
import { approvalErrorResponse, throwDatabaseError } from '../../_shared/errors';
import { validateDocumentReferences } from '../../_shared/document-references';
import { requireVisibleApprovalDocument } from '../../_shared/visibility';
import { approvalDocumentViews } from '../../_shared/presentation';

export const dynamic = 'force-dynamic';

type RouteContext = { readonly params: Promise<{ readonly id: string }> };

async function fetchDocument(
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
    return data;
}

async function detailData(
    context: Awaited<ReturnType<typeof resolveApprovalContext>>,
    document: ApprovalDocumentRow
) {
    const versionQuery = document.current_version_id
        ? context.supabase.from('approval_document_versions').select(DOCUMENT_VERSION_SELECT)
            .eq('id', document.current_version_id).eq('company_id', context.companyId)
            .maybeSingle<ApprovalDocumentVersionRow>()
        : Promise.resolve({ data: null, error: null });
    const stepsQuery = document.current_version_id
        ? context.supabase.from('approval_document_steps').select(DOCUMENT_STEP_SELECT)
            .eq('document_id', document.id).eq('company_id', context.companyId)
            .eq('document_version_id', document.current_version_id)
            .order('step_order', { ascending: true }).returns<ApprovalDocumentStepRow[]>()
        : Promise.resolve({ data: [] as ApprovalDocumentStepRow[], error: null });
    const [version, steps, readers, events, attachments] = await Promise.all([
        versionQuery,
        stepsQuery,
        context.supabase.from('approval_document_readers').select(DOCUMENT_READER_SELECT)
            .eq('document_id', document.id).eq('company_id', context.companyId)
            .order('created_at', { ascending: true }).returns<ApprovalDocumentReaderRow[]>(),
        context.supabase.from('approval_document_events').select(DOCUMENT_EVENT_SELECT)
            .eq('document_id', document.id).eq('company_id', context.companyId)
            .order('created_at', { ascending: true }).returns<ApprovalDocumentEventRow[]>(),
        context.supabase.from('approval_attachments')
            .select('id, file_name, mime_type, size_bytes, created_at')
            .eq('document_id', document.id).eq('company_id', context.companyId)
            .order('created_at', { ascending: true })
    ]);
    throwDatabaseError(version.error);
    throwDatabaseError(steps.error);
    throwDatabaseError(readers.error);
    throwDatabaseError(events.error);
    throwDatabaseError(attachments.error);
    const templateFields = version.data?.template_version_id
        ? await context.supabase.from('approval_template_versions').select('fields')
            .eq('id', version.data.template_version_id).eq('company_id', context.companyId)
            .maybeSingle<{ readonly fields: unknown }>()
        : { data: null, error: null };
    throwDatabaseError(templateFields.error);
    const stepRows = steps.data || [];
    const activeStep = stepRows.find(step => step.status === 'active' && step.step_order === document.current_step_order);
    const eligibleActions: string[] = [];
    if (document.status === '제출' && activeStep
        && actorAppearsInTargets(activeStep.targets, context.requester.id)
        && !actorAlreadyResponded(activeStep.targets, activeStep.responses, context.requester.id)) {
        if (activeStep.action_kind === 'approval') eligibleActions.push('approve', 'reject');
        if (activeStep.action_kind === 'agreement') eligibleActions.push('agree', 'disagree');
        if (activeStep.action_kind === 'acknowledgement') eligibleActions.push('acknowledge');
    }
    if (document.author_profile_id === context.requester.id) {
        if (document.status === '제출' && stepRows.every(step => !Array.isArray(step.responses) || step.responses.length === 0)) {
            eligibleActions.push('withdraw');
        }
        if (document.status === '승인') eligibleActions.push('complete');
    }
    const [presentedDocument] = await approvalDocumentViews(context, [document]);
    return {
        document: presentedDocument || documentView(document),
        editable: document.author_profile_id === context.requester.id && ['임시저장', '반려', '회수'].includes(document.status),
        fields: templateFields.data?.fields || [],
        version: version.data ? {
            id: version.data.id, version: version.data.version_number,
            templateVersionId: version.data.template_version_id, title: version.data.title,
            values: version.data.values, body: version.data.body,
            organizationSnapshot: version.data.organization_snapshot,
            stepsSnapshot: version.data.steps_snapshot, submittedAt: version.data.submitted_at,
            createdAt: version.data.created_at
        } : null,
        steps: stepRows.map(step => ({
            id: step.id, versionId: step.document_version_id, order: step.step_order,
            key: step.step_key, name: step.name, action: step.action_kind,
            mode: step.completion_mode, status: step.status, targets: step.targets,
            responses: step.responses, startedAt: step.started_at, completedAt: step.completed_at
        })),
        readers: (readers.data || []).map(reader => ({
            id: reader.id, profileId: reader.profile_id, canDownload: reader.can_download,
            firstReadAt: reader.first_read_at, createdAt: reader.created_at
        })),
        events: (events.data || []).map(event => ({
            id: event.id, type: event.event_type, action: event.action_key,
            actorProfileId: event.actor_profile_id, actor: event.actor_snapshot,
            fromStatus: event.from_status, toStatus: event.to_status,
            memo: event.memo, payload: event.payload, createdAt: event.created_at
        })),
        attachments: (attachments.data || []).map(attachment => ({
            id: attachment.id,
            name: attachment.file_name,
            mimeType: attachment.mime_type,
            size: attachment.size_bytes,
            url: `/api/approvals/documents/${encodeURIComponent(document.id)}/attachments?attachmentId=${encodeURIComponent(attachment.id)}`
        })),
        eligibleActions
    };
}

export async function GET(request: Request, routeContext: RouteContext) {
    try {
        const context = await resolveApprovalContext(request);
        const id = parseRequiredUuid((await routeContext.params).id, 'id');
        const document = await requireVisibleApprovalDocument(context, await fetchDocument(context, id));
        if (!document) return fail(404, 'NOT_FOUND', 'Approval document not found');
        return ok(await detailData(context, document));
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to load approval document');
    }
}

function patchInput(document: ApprovalDocumentRow, body: JsonRecord, readers: readonly string[]): JsonRecord {
    const receivers = receiverIds(document.data);
    return {
        templateId: document.template_id,
        approverProfileId: document.approver_profile_id,
        title: document.title,
        values: isRecord(document.values) ? document.values : {},
        body: isRecord(document.data) ? document.data : {},
        readerProfileIds: readers,
        receiverUnitIds: receivers.unitIds,
        receiverProfileIds: receivers.profileIds,
        sourceType: document.source_type,
        sourceId: document.source_id,
        category: document.category,
        securityLevel: document.security_level,
        dueAt: document.due_at,
        ...body
    };
}

export async function PATCH(request: Request, routeContext: RouteContext) {
    try {
        const body = await readJsonRecord(request);
        const context = await resolveApprovalContext(request, body);
        const id = parseRequiredUuid((await routeContext.params).id, 'id');
        const document = await fetchDocument(context, id);
        if (!document || document.author_profile_id !== context.requester.id) {
            return fail(404, 'NOT_FOUND', 'Approval document not found');
        }
        if (!['임시저장', '반려', '회수'].includes(document.status)) {
            return fail(409, 'CONFLICT', 'Submitted approval documents cannot be edited');
        }
        if (hasProtectedDocumentSourceFields(body)) {
            return fail(400, 'VALIDATION_ERROR', 'Source linkage cannot be changed from the public approval API');
        }
        const { data: currentReaders, error: readerFetchError } = await context.supabase
            .from('approval_document_readers')
            .select('profile_id')
            .eq('document_id', id)
            .eq('company_id', context.companyId)
            .returns<Array<{ readonly profile_id: string }>>();
        throwDatabaseError(readerFetchError);
        const draft = parseDocumentDraft(patchInput(
            document,
            body,
            (currentReaders || []).map(reader => reader.profile_id)
        ));
        await validateDocumentReferences(context, draft);
        const { readerProfileIds, ...updates } = draft;
        const { data, error } = await context.supabase
            .from('approval_documents')
            .update({ ...updates, updated_by: context.requester.id, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('company_id', context.companyId)
            .select(DOCUMENT_SELECT)
            .single<ApprovalDocumentRow>();
        throwDatabaseError(error);
        if (!data) return fail(404, 'NOT_FOUND', 'Approval document not found');
        if (hasOwn(body, 'readerProfileIds')) {
            const { error: readerError } = await context.supabase.rpc('replace_approval_document_readers', {
                p_actor_profile_id: context.requester.id,
                p_company_id: context.companyId,
                p_document_id: id,
                p_reader_profile_ids: readerProfileIds
            });
            throwDatabaseError(readerError);
        }
        return ok(await detailData(context, data));
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to update approval document');
    }
}
