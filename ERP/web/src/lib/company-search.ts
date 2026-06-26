function normalizeCompanySearchValue(value: string): string {
    return value.trim().normalize('NFC').replace(/\s+/g, '').toLowerCase();
}

export function doesCompanyNameMatchQuery(companyName: string, query: string): boolean {
    const normalizedName = normalizeCompanySearchValue(companyName);
    const normalizedQuery = normalizeCompanySearchValue(query);
    if (!normalizedName || !normalizedQuery) return false;
    return normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName);
}
