export type LeadTableColumnKey =
    | 'priority'
    | 'name'
    | 'mobile'
    | 'status'
    | 'disclosure'
    | 'manager'
    | 'source'
    | 'desiredRegion'
    | 'budget'
    | 'interestedBrand'
    | 'nextContactAt'
    | 'memo'
    | 'links'
    | 'actions';

export type LeadTableFilters = {
    readonly regionQuery: string;
    readonly budgetMin: string;
    readonly budgetMax: string;
};

export type LeadTableSortKey =
    | 'created_desc'
    | 'created_asc'
    | 'budget_asc'
    | 'budget_desc'
    | 'priority_only'
    | 'disclosure_recent'
    | 'disclosure_eligible';
