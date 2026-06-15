export type LeadManagerScopedRecord = {
    readonly managerId?: string | null;
};

export function normalizeLeadManagerScopeIds(scopeIds: readonly string[]) {
    return Array.from(new Set(scopeIds.map(id => id.trim()).filter(Boolean)));
}

export function filterLeadsByManagerScope<T extends LeadManagerScopedRecord>(
    leads: readonly T[],
    scopeIds: readonly string[]
): readonly T[] {
    const normalizedScopeIds = normalizeLeadManagerScopeIds(scopeIds);
    if (normalizedScopeIds.length === 0) return [];

    const managerScope = new Set(normalizedScopeIds);
    return leads.filter(lead => {
        const managerId = lead.managerId?.trim();
        return managerId ? managerScope.has(managerId) : false;
    });
}
