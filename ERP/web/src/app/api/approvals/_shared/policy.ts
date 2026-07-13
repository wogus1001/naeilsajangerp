import type { RequesterProfile } from '@/lib/api-auth';

type DocumentVisibilityFacts = {
    readonly requesterId: string;
    readonly authorProfileId: string | null;
    readonly pastOrActiveAssignee: boolean;
    readonly reader: boolean;
    readonly organizationReceiver: boolean;
    readonly approvalAdmin: boolean;
    readonly globalAdmin: boolean;
};

export function canManageApprovals(requester: RequesterProfile, approvalAdmin: boolean): boolean {
    return requester.role === 'admin' || requester.role === 'manager' || approvalAdmin;
}

export function canViewApprovalDocument(facts: DocumentVisibilityFacts): boolean {
    return facts.globalAdmin ||
        facts.approvalAdmin ||
        facts.authorProfileId === facts.requesterId ||
        facts.pastOrActiveAssignee ||
        facts.reader ||
        facts.organizationReceiver;
}
