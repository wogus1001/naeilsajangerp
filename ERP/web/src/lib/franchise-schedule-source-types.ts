const FRANCHISE_OPERATIONS_SCHEDULE_SOURCE_TYPES = new Set([
    'supervision-visit',
    'supervision-report',
    'supervision-corrective-action',
    'opening-project',
    'owner-general-request',
    'owner-facility-request',
    'owner-checklist-completion',
    'owner-settlement-review',
    'vendor-contract-renewal',
    'disclosure-contract-eligible'
]);

export function isFranchiseOperationsScheduleSource(sourceType: string | null | undefined): boolean {
    return FRANCHISE_OPERATIONS_SCHEDULE_SOURCE_TYPES.has(sourceType?.trim() || '');
}
