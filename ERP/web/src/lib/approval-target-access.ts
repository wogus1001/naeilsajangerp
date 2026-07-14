type ApprovalTarget = {
    readonly profileId: string;
    readonly delegateProfileIds: readonly string[];
};

export type ActiveApprovalDelegationGrant = {
    readonly delegatorProfileId: string;
    readonly actionScope: readonly string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function approvalTargets(value: unknown): readonly ApprovalTarget[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap(item => {
        if (!isRecord(item) || typeof item.profile_id !== 'string') return [];
        return [{
            profileId: item.profile_id,
            delegateProfileIds: Array.isArray(item.delegate_profile_ids)
                ? item.delegate_profile_ids.filter((id): id is string => typeof id === 'string')
                : []
        }];
    });
}

function targetProfileIdForActor(
    targets: unknown,
    actorId: string,
    actionKind: string,
    activeDelegations: readonly ActiveApprovalDelegationGrant[]
): string | null {
    const directTarget = approvalTargets(targets).find(target => target.profileId === actorId);
    if (directTarget) return directTarget.profileId;

    const delegatedProfileIds = new Set(activeDelegations
        .filter(grant => grant.actionScope.includes(actionKind))
        .map(grant => grant.delegatorProfileId));
    const delegatedTarget = approvalTargets(targets).find(target => (
        target.delegateProfileIds.includes(actorId) && delegatedProfileIds.has(target.profileId)
    ));
    return delegatedTarget?.profileId || null;
}

export function actorAppearsInTargets(
    targets: unknown,
    actorId: string,
    actionKind: string,
    activeDelegations: readonly ActiveApprovalDelegationGrant[]
): boolean {
    return targetProfileIdForActor(targets, actorId, actionKind, activeDelegations) !== null;
}

export function actorAlreadyResponded(
    targets: unknown,
    responses: unknown,
    actorId: string,
    actionKind: string,
    activeDelegations: readonly ActiveApprovalDelegationGrant[]
): boolean {
    if (!Array.isArray(responses)) return false;
    const targetProfileId = targetProfileIdForActor(targets, actorId, actionKind, activeDelegations);
    return targetProfileId !== null && responses.some(response => (
        isRecord(response) && response.target_profile_id === targetProfileId
    ));
}
