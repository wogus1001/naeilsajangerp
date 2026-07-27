type MetaFormQuery = {
    eq(column: string, value: string): MetaFormQuery;
};

export type MetaFormScopeFilters = {
    formId?: string;
    companyId?: string;
};

export function applyMetaFormScopeFilters<T extends MetaFormQuery>(
    query: T,
    filters: MetaFormScopeFilters
): T {
    let scopedQuery: MetaFormQuery = query;
    if (filters.formId) scopedQuery = scopedQuery.eq('id', filters.formId);
    if (filters.companyId) scopedQuery = scopedQuery.eq('company_id', filters.companyId);
    return scopedQuery as T;
}
