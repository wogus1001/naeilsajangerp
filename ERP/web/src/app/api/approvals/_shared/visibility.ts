import type { ApprovalContext } from './access';
import {
    actorAppearsInTargets,
    receiverIds,
    type ApprovalDocumentRow,
    type ApprovalDocumentStepRow
} from './documents';
import { throwDatabaseError } from './errors';
import { canViewApprovalDocument } from './policy';

type ReaderAccessRow = {
    readonly document_id: string;
};

type MembershipAccessRow = {
    readonly unit_id: string;
};

export async function visibleApprovalDocuments(
    context: ApprovalContext,
    documents: readonly ApprovalDocumentRow[]
): Promise<readonly ApprovalDocumentRow[]> {
    if (documents.length === 0 || context.requester.role === 'admin' || context.approvalAdmin) return documents;
    const documentIds = documents.map(document => document.id);
    const [steps, readers, memberships] = await Promise.all([
        context.supabase
            .from('approval_document_steps')
            .select('id, document_id, document_version_id, step_order, step_key, name, action_kind, completion_mode, status, targets, responses, started_at, completed_at')
            .eq('company_id', context.companyId)
            .in('document_id', documentIds)
            .returns<ApprovalDocumentStepRow[]>(),
        context.supabase
            .from('approval_document_readers')
            .select('document_id')
            .eq('company_id', context.companyId)
            .eq('profile_id', context.requester.id)
            .in('document_id', documentIds)
            .returns<ReaderAccessRow[]>(),
        context.supabase
            .from('organization_memberships')
            .select('unit_id')
            .eq('company_id', context.companyId)
            .eq('profile_id', context.requester.id)
            .eq('active', true)
            .returns<MembershipAccessRow[]>()
    ]);
    throwDatabaseError(steps.error);
    throwDatabaseError(readers.error);
    throwDatabaseError(memberships.error);
    const readerDocumentIds = new Set((readers.data || []).map(row => row.document_id));
    const requesterUnitIds = new Set((memberships.data || []).map(row => row.unit_id));
    return documents.filter(document => {
        const receivers = receiverIds(document.data);
        return canViewApprovalDocument({
            requesterId: context.requester.id,
            authorProfileId: document.author_profile_id,
            pastOrActiveAssignee: document.approver_profile_id === context.requester.id || (steps.data || []).some(step =>
                step.document_id === document.id && actorAppearsInTargets(step.targets, context.requester.id)),
            reader: readerDocumentIds.has(document.id),
            organizationReceiver: (
                receivers.profileIds.includes(context.requester.id) ||
                receivers.unitIds.some(unitId => requesterUnitIds.has(unitId))
            ),
            approvalAdmin: context.approvalAdmin,
            globalAdmin: context.requester.role === 'admin',
            securityLevel: document.security_level
        });
    });
}

export async function requireVisibleApprovalDocument(
    context: ApprovalContext,
    document: ApprovalDocumentRow | null
): Promise<ApprovalDocumentRow | null> {
    if (!document) return null;
    const visible = await visibleApprovalDocuments(context, [document]);
    return visible[0] || null;
}
