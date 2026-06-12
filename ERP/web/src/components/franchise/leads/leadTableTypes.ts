export type LeadTableColumnKey =
    | 'priority'
    | 'name'
    | 'mobile'
    | 'status'
    | 'manager'
    | 'source'
    | 'desiredRegion'
    | 'budget'
    | 'interestedBrand'
    | 'nextContactAt'
    | 'contractChecklist'
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
    | 'priority_only';
