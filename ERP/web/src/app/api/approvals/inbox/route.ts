import { ok } from '@/lib/api-response';
import { resolveApprovalContext } from '../_shared/access';
import { parseInboxQuery, type InboxFilter } from '../_shared/boundary';
import {
    DOCUMENT_SELECT,
    DOCUMENT_STEP_SELECT,
    actorAppearsInTargets,
    actorAlreadyResponded,
    documentView,
    receiverIds,
    type ApprovalDocumentRow,
    type ApprovalDocumentStepRow
} from '../_shared/documents';
import { approvalErrorResponse, throwDatabaseError } from '../_shared/errors';
import { approvalDocumentViews } from '../_shared/presentation';
import { visibleApprovalDocuments } from '../_shared/visibility';

export const dynamic = 'force-dynamic';

type ReaderRow = { readonly document_id: string };
type MembershipRow = { readonly unit_id: string };

function matchesFilter(input: {
    readonly filter: InboxFilter;
    readonly document: ApprovalDocumentRow;
    readonly requesterId: string;
    readonly waitingDocumentIds: ReadonlySet<string>;
    readonly readerDocumentIds: ReadonlySet<string>;
    readonly receiverUnitIds: ReadonlySet<string>;
}): boolean {
    const { filter, document } = input;
    switch (filter) {
        case 'waiting':
            return document.status === '제출' && input.waitingDocumentIds.has(document.id);
        case 'drafted':
            return document.status === '임시저장' && document.author_profile_id === input.requesterId;
        case 'mine':
            return document.author_profile_id === input.requesterId;
        case 'rejected':
            return document.status === '반려' && document.author_profile_id === input.requesterId;
        case 'reference':
            return input.readerDocumentIds.has(document.id);
        case 'received':
        case 'department': {
            const receivers = receiverIds(document.data);
            return receivers.profileIds.includes(input.requesterId) ||
                receivers.unitIds.some(unitId => input.receiverUnitIds.has(unitId));
        }
        default:
            return assertNever(filter);
    }
}

function assertNever(value: never): never {
    throw new TypeError(`Unsupported approval inbox filter: ${value}`);
}

export async function GET(request: Request) {
    try {
        const context = await resolveApprovalContext(request);
        const parsed = parseInboxQuery(new URL(request.url).searchParams);
        const [documents, steps, readers, memberships] = await Promise.all([
            context.supabase.from('approval_documents').select(DOCUMENT_SELECT)
                .eq('company_id', context.companyId).order('updated_at', { ascending: false })
                .returns<ApprovalDocumentRow[]>(),
            context.supabase.from('approval_document_steps').select(DOCUMENT_STEP_SELECT)
                .eq('company_id', context.companyId).eq('status', 'active')
                .returns<ApprovalDocumentStepRow[]>(),
            context.supabase.from('approval_document_readers').select('document_id')
                .eq('company_id', context.companyId).eq('profile_id', context.requester.id)
                .returns<ReaderRow[]>(),
            context.supabase.from('organization_memberships').select('unit_id')
                .eq('company_id', context.companyId).eq('profile_id', context.requester.id).eq('active', true)
                .returns<MembershipRow[]>()
        ]);
        throwDatabaseError(documents.error);
        throwDatabaseError(steps.error);
        throwDatabaseError(readers.error);
        throwDatabaseError(memberships.error);
        const waitingDocumentIds = new Set((steps.data || [])
            .filter(step => actorAppearsInTargets(step.targets, context.requester.id)
                && !actorAlreadyResponded(step.targets, step.responses, context.requester.id))
            .map(step => step.document_id));
        const readerDocumentIds = new Set((readers.data || []).map(reader => reader.document_id));
        const receiverUnitIds = new Set((memberships.data || []).map(membership => membership.unit_id));
        const matched = (documents.data || []).filter(document => matchesFilter({
            filter: parsed.filter,
            document,
            requesterId: context.requester.id,
            waitingDocumentIds,
            readerDocumentIds,
            receiverUnitIds
        }));
        const filtered = await visibleApprovalDocuments(context, matched);
        const delayedTotal = filtered.filter(document => document.due_at && new Date(document.due_at).getTime() < Date.now()).length;
        const offset = (parsed.page - 1) * parsed.pageSize;
        const pageDocuments = filtered.slice(offset, offset + parsed.pageSize);
        return ok({
            filter: parsed.filter,
            documents: await approvalDocumentViews(context, pageDocuments),
            summary: { delayedTotal },
            pagination: {
                page: parsed.page,
                pageSize: parsed.pageSize,
                total: filtered.length,
                totalPages: Math.ceil(filtered.length / parsed.pageSize)
            }
        });
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to load approval inbox');
    }
}
