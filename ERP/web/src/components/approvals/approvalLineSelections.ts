import type {
    ApprovalLineSelections,
    ApprovalOrganization,
    ApprovalTemplateStep
} from './approvalTypes';

export function selectedApprovalSteps(
    steps: readonly ApprovalTemplateStep[],
    selections: ApprovalLineSelections,
    organization: ApprovalOrganization | null
): readonly ApprovalTemplateStep[] {
    return steps.flatMap(step => {
        const profileIds = selections[step.id] ?? [];
        if (profileIds.length === 0) return [step];
        const names = profileIds.map(profileId => (
            organization?.people.find(person => person.id === profileId)?.name ?? '선택한 구성원'
        ));
        if (step.mode === 'sequential') {
            return profileIds.map((profileId, index) => ({
                ...step,
                id: `${step.id}:${profileId}`,
                label: profileIds.length > 1 ? `${step.label} ${index + 1}` : step.label,
                target: { kind: 'profiles' as const, profileIds: [profileId] },
                targetLabel: names[index] ?? '선택한 구성원'
            }));
        }
        return [{
            ...step,
            target: { kind: 'profiles' as const, profileIds },
            targetLabel: names.join(', ')
        }];
    });
}

export function approvalLineSelectionCount(selections: ApprovalLineSelections): number {
    return new Set(Object.values(selections).flat()).size;
}

export function updateApprovalLineSelection(
    selections: ApprovalLineSelections,
    step: ApprovalTemplateStep,
    profileId: string,
    checked: boolean
): ApprovalLineSelections {
    const current = selections[step.id] ?? [];
    const next = checked ? [...new Set([...current, profileId])] : current.filter(id => id !== profileId);
    return { ...selections, [step.id]: next };
}

export function moveApprovalLineSelection(
    selections: ApprovalLineSelections,
    stepId: string,
    profileId: string,
    direction: -1 | 1
): ApprovalLineSelections {
    const current = [...(selections[stepId] ?? [])];
    const index = current.indexOf(profileId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return selections;
    [current[index], current[targetIndex]] = [current[targetIndex], current[index]];
    return { ...selections, [stepId]: current };
}
