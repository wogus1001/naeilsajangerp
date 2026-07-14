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
import { filterApprovalInboxDocuments } from '../_shared/inbox-filtering';
import { approvalDocumentViews } from '../_shared/presentation';
import { visibleApprovalDocuments } from '../_shared/visibility';
import { loadCurrentApprovalDelegations } from '@/lib/approval-delegation-access';

export const dynamic = 'force-dynamic';

type ReaderRow = { readonly document_id: string };
type MembershipRow = { readonly unit_id: string };
const QUERY_PAGE_SIZE = 500;

async function allRows<Row>(load: (from: number, to: number) => PromiseLike<{
    readonly data: Row[] | null;
    readonly error: unknown;
}>): Promise<readonly Row[]> {
    const rows: Row[] = [];
    for (let from = 0; ; from += QUERY_PAGE_SIZE) {
        const result = await load(from, from + QUERY_PAGE_SIZE - 1);
        throwDatabaseError(result.error);
        const page = result.data || [];
        rows.push(...page);
        if (page.length < QUERY_PAGE_SIZE) return rows;
    }
}

async function visibleInBatches(
    context: Awaited<ReturnType<typeof resolveApprovalContext>>,
    documents: readonly ApprovalDocumentRow[]
): Promise<readonly ApprovalDocumentRow[]> {
    const visible: ApprovalDocumentRow[] = [];
    for (let offset = 0; offset < documents.length; offset += QUERY_PAGE_SIZE) {
        visible.push(...await visibleApprovalDocuments(context, documents.slice(offset, offset + QUERY_PAGE_SIZE)));
    }
    return visible;
}

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
        const [documents, steps, readers, memberships, delegations] = await Promise.all([
            allRows<ApprovalDocumentRow>((from, to) => context.supabase.from('approval_documents').select(DOCUMENT_SELECT)
                .eq('company_id', context.companyId).order('updated_at', { ascending: false })
                .range(from, to).returns<ApprovalDocumentRow[]>()),
            allRows<ApprovalDocumentStepRow>((from, to) => context.supabase.from('approval_document_steps').select(DOCUMENT_STEP_SELECT)
                .eq('company_id', context.companyId).eq('status', 'active')
                .range(from, to).returns<ApprovalDocumentStepRow[]>()),
            allRows<ReaderRow>((from, to) => context.supabase.from('approval_document_readers').select('document_id')
                .eq('company_id', context.companyId).eq('profile_id', context.requester.id)
                .range(from, to).returns<ReaderRow[]>()),
            allRows<MembershipRow>((from, to) => context.supabase.from('organization_memberships').select('unit_id')
                .eq('company_id', context.companyId).eq('profile_id', context.requester.id).eq('active', true)
                .range(from, to).returns<MembershipRow[]>()),
            loadCurrentApprovalDelegations(context.supabase, context.companyId, context.requester.id)
        ]);
        const waitingDocumentIds = new Set(steps
            .filter(step => actorAppearsInTargets(
                step.targets,
                context.requester.id,
                step.action_kind,
                delegations
            ) && !actorAlreadyResponded(
                step.targets,
                step.responses,
                context.requester.id,
                step.action_kind,
                delegations
            ))
            .map(step => step.document_id));
        const readerDocumentIds = new Set(readers.map(reader => reader.document_id));
        const receiverUnitIds = new Set(memberships.map(membership => membership.unit_id));
        const matched = documents.filter(document => matchesFilter({
            filter: parsed.filter,
            document,
            requesterId: context.requester.id,
            waitingDocumentIds,
            readerDocumentIds,
            receiverUnitIds
        }));
        const filtered = await visibleInBatches(context, matched);
        const views = await approvalDocumentViews(context, filtered);
        const searched = filterApprovalInboxDocuments(views, parsed);
        const delayedTotal = searched.filter(document => document.dueAt && new Date(document.dueAt).getTime() < Date.now()).length;
        const offset = (parsed.page - 1) * parsed.pageSize;
        const pageDocuments = searched.slice(offset, offset + parsed.pageSize);
        return ok({
            filter: parsed.filter,
            documents: pageDocuments,
            summary: { delayedTotal },
            pagination: {
                page: parsed.page,
                pageSize: parsed.pageSize,
                total: searched.length,
                totalPages: Math.ceil(searched.length / parsed.pageSize)
            }
        });
    } catch (error) {
        return approvalErrorResponse(error, 'Failed to load approval inbox');
    }
}
