const FRANCHISE_OPERATIONS_SCHEDULE_SOURCE_TYPES = new Set([
    'supervision-visit',
    'supervision-report',
    'supervision-corrective-action',
    'opening-project',
    'owner-facility-request',
    'owner-checklist-completion',
    'vendor-contract-renewal',
    'disclosure-contract-eligible'
]);

export function isFranchiseOperationsScheduleSource(sourceType: string | null | undefined): boolean {
    return FRANCHISE_OPERATIONS_SCHEDULE_SOURCE_TYPES.has(sourceType?.trim() || '');
}
