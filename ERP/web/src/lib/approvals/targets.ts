import type {
    OrganizationMembershipSnapshot,
    OrganizationSnapshot,
    ProfileId,
    ResolvedStep,
    ResolvedStepTarget,
    StepActionKind,
    TemplateStep
} from './types';

export type TargetResolutionContext = {
    readonly authorProfileId: ProfileId;
    readonly effectiveAt: string;
};

function sameId(left: { readonly value: string }, right: { readonly value: string }): boolean {
    return left.value === right.value;
}

function activeAt(start: string | null, end: string | null, effectiveAt: string): boolean {
    return (start === null || start <= effectiveAt) && (end === null || effectiveAt <= end);
}

function membershipFor(snapshot: OrganizationSnapshot, id: ProfileId): OrganizationMembershipSnapshot | null {
    return snapshot.memberships.find(item => item.active && item.primary && sameId(item.profileId, id))
        ?? snapshot.memberships.find(item => item.active && sameId(item.profileId, id))
        ?? null;
}

function targetFor(
    snapshot: OrganizationSnapshot,
    id: ProfileId,
    roleKey: string,
    action: StepActionKind,
    effectiveAt: string
): ResolvedStepTarget {
    const membership = membershipFor(snapshot, id);
    const unit = membership === null
        ? null
        : snapshot.units.find(item => item.active && sameId(item.id, membership.unitId)) ?? null;
    const delegateProfileIds = snapshot.delegations
        .filter(item => sameId(item.delegatorProfileId, id)
            && item.actions.includes(action)
            && activeAt(item.activeFrom, item.activeUntil, effectiveAt))
        .map(item => ({ ...item.delegateProfileId }));
    return {
        profileId: { ...id },
        profileName: membership?.profileName ?? '',
        unitId: membership === null ? null : { ...membership.unitId },
        unitName: unit?.name ?? '',
        roleKey,
        delegateProfileIds
    };
}

function selectedProfiles(
    step: TemplateStep,
    snapshot: OrganizationSnapshot,
    authorProfileId: ProfileId,
    effectiveAt: string
): readonly { readonly id: ProfileId; readonly roleKey: string }[] {
    const target = step.target;
    switch (target.kind) {
        case 'profiles':
            return target.profileIds.map(id => ({ id, roleKey: '' }));
        case 'role':
            return snapshot.roleAssignments
                .filter(item => item.roleKey === target.roleKey
                    && activeAt(item.activeFrom, item.activeUntil, effectiveAt)
                    && (target.unitId === null
                        || (item.unitId !== null && sameId(item.unitId, target.unitId))))
                .map(item => ({ id: item.profileId, roleKey: item.roleKey }));
        case 'unit_manager': {
            const unit = snapshot.units.find(item => item.active && sameId(item.id, target.unitId));
            return unit?.managerProfileId ? [{ id: unit.managerProfileId, roleKey: 'unit_manager' }] : [];
        }
        case 'unit_members':
            return snapshot.memberships
                .filter(item => item.active && sameId(item.unitId, target.unitId))
                .map(item => ({ id: item.profileId, roleKey: 'unit_member' }));
        case 'author_manager': {
            const authorMembership = membershipFor(snapshot, authorProfileId);
            const unit = authorMembership === null
                ? null
                : snapshot.units.find(item => item.active && sameId(item.id, authorMembership.unitId)) ?? null;
            return unit?.managerProfileId ? [{ id: unit.managerProfileId, roleKey: 'author_manager' }] : [];
        }
        default:
            return assertNever(target);
    }
}

function assertNever(value: never): never {
    throw new TypeError(`지원하지 않는 결재 대상입니다: ${JSON.stringify(value)}`);
}

export function resolveStepTargets(
    steps: readonly TemplateStep[],
    snapshot: OrganizationSnapshot,
    context: TargetResolutionContext
): readonly ResolvedStep[] {
    return steps.map(step => {
        const targets: ResolvedStepTarget[] = [];
        for (const selected of selectedProfiles(step, snapshot, context.authorProfileId, context.effectiveAt)) {
            if (targets.some(item => sameId(item.profileId, selected.id))) continue;
            targets.push(targetFor(snapshot, selected.id, selected.roleKey, step.action, context.effectiveAt));
        }
        return {
            key: step.key,
            order: step.order,
            label: step.label,
            action: step.action,
            mode: step.mode,
            targets
        };
    });
}
