import type { FranchiseLeadStage } from './franchise-leads';

export const RETURN_TO_RAW_INTAKE_TRANSITION = 'return_to_raw_intake' as const;

export function resolveUpdatedLeadStage(
    existingStage: FranchiseLeadStage,
    incomingStage: FranchiseLeadStage | null,
    transition: unknown
): FranchiseLeadStage | null {
    if (incomingStage === null) return null;
    if (
        existingStage === 'candidate'
        && incomingStage === 'raw_intake'
        && transition !== RETURN_TO_RAW_INTAKE_TRANSITION
    ) {
        return 'candidate';
    }
    return incomingStage;
}
