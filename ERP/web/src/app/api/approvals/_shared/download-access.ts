import type { ApprovalContext } from './access';
import {
    actorAppearsInTargets,
    receiverIds,
    type ApprovalDocumentRow,
    type ApprovalDocumentStepRow
} from './documents';
import { throwDatabaseError } from './errors';
import { loadCurrentApprovalDelegations } from '@/lib/approval-delegation-access';

type MembershipRow = {
    readonly unit_id: string;
    readonly starts_on: string | null;
    readonly ends_on: string | null;
};

export function isCurrentOrganizationMembership(
    membership: Pick<MembershipRow, 'starts_on' | 'ends_on'>,
    date = new Date().toISOString().slice(0, 10)
): boolean {
    return (!membership.starts_on || membership.starts_on <= date)
        && (!membership.ends_on || date <= membership.ends_on);
}

export async function canDownloadApprovalDocument(
    context: ApprovalContext,
    document: ApprovalDocumentRow
): Promise<boolean> {
    if (context.requester.role === 'admin' || context.approvalAdmin || document.author_profile_id === context.requester.id) return true;
    const receivers = receiverIds(document.data);
    if (receivers.profileIds.includes(context.requester.id)) return true;
    const [steps, reader, memberships, delegations] = await Promise.all([
        context.supabase.from('approval_document_steps')
            .select('id, document_id, document_version_id, step_order, step_key, name, action_kind, completion_mode, status, targets, responses, started_at, completed_at')
            .eq('document_id', document.id).eq('company_id', context.companyId).returns<ApprovalDocumentStepRow[]>(),
        context.supabase.from('approval_document_readers').select('can_download')
            .eq('document_id', document.id).eq('company_id', context.companyId)
            .eq('profile_id', context.requester.id).maybeSingle<{ readonly can_download: boolean }>(),
        context.supabase.from('organization_memberships').select('unit_id, starts_on, ends_on')
            .eq('company_id', context.companyId).eq('profile_id', context.requester.id).eq('active', true)
            .returns<MembershipRow[]>(),
        loadCurrentApprovalDelegations(context.supabase, context.companyId, context.requester.id)
    ]);
    throwDatabaseError(steps.error);
    throwDatabaseError(reader.error);
    throwDatabaseError(memberships.error);
    return (steps.data || []).some(step => actorAppearsInTargets(
        step.targets,
        context.requester.id,
        step.action_kind,
        delegations
    ))
        || reader.data?.can_download === true
        || (memberships.data || []).some(membership =>
            isCurrentOrganizationMembership(membership) && receivers.unitIds.includes(membership.unit_id));
}
