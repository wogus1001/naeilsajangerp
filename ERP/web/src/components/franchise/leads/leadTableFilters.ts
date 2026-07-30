import type { LeadTableFilters, LeadTableSortKey } from './leadTableTypes';
import type { LeadDisclosureSummary } from '@/lib/franchise-lead-disclosure-summary';

export type LeadTableFilterableLead = {
    readonly desiredRegion: string;
    readonly budgetMin: number | null;
    readonly budgetMax: number | null;
    readonly createdAt: string;
    readonly grade: string;
    readonly disclosureSummary?: LeadDisclosureSummary | null;
};

function splitRegionQueries(value: string): readonly string[] {
    return value
        .split(/[\s,，、]+/u)
        .map(item => item.trim().toLowerCase())
        .filter(Boolean);
}

function parseBudgetFilterToWon(value: string): number | null {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return null;

    const parsed = Number(normalized.replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(parsed)) return null;
    return Math.abs(parsed) >= 1_000_000 ? parsed : parsed * 10_000;
}

function getLeadBudgetRange(lead: LeadTableFilterableLead): { readonly min: number; readonly max: number } | null {
    const values = [lead.budgetMin, lead.budgetMax]
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (values.length === 0) return null;
    return {
        min: Math.min(...values),
        max: Math.max(...values)
    };
}

function matchesBudgetFilter(lead: LeadTableFilterableLead, filters: LeadTableFilters): boolean {
    const filterMin = parseBudgetFilterToWon(filters.budgetMin);
    const filterMax = parseBudgetFilterToWon(filters.budgetMax);
    if (filterMin === null && filterMax === null) return true;

    const leadRange = getLeadBudgetRange(lead);
    if (!leadRange) return false;

    const lowerBound = filterMin ?? Number.NEGATIVE_INFINITY;
    const upperBound = filterMax ?? Number.POSITIVE_INFINITY;
    return leadRange.max >= lowerBound && leadRange.min <= upperBound;
}

function matchesRegionFilter(lead: LeadTableFilterableLead, filters: LeadTableFilters): boolean {
    const queries = splitRegionQueries(filters.regionQuery);
    if (queries.length === 0) return true;
    const desiredRegion = lead.desiredRegion.toLowerCase();
    return queries.some(query => desiredRegion.includes(query));
}

export function filterLeadTableLeads<T extends LeadTableFilterableLead>(
    leads: readonly T[],
    filters: LeadTableFilters
): readonly T[] {
    return leads.filter(lead => matchesRegionFilter(lead, filters) && matchesBudgetFilter(lead, filters));
}

function getLeadBudgetSortValue(lead: LeadTableFilterableLead): number {
    const leadRange = getLeadBudgetRange(lead);
    return leadRange?.min ?? Number.POSITIVE_INFINITY;
}

function getCreatedTime(lead: LeadTableFilterableLead): number {
    const time = new Date(lead.createdAt).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function getDisclosureTime(value?: string | null): number {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function getDisclosureEligibleSortValue(lead: LeadTableFilterableLead): number {
    const summary = lead.disclosureSummary;
    if (!summary?.contractEligibleAt) return Number.POSITIVE_INFINITY;
    return getDisclosureTime(summary.contractEligibleAt);
}

export function sortLeadTableLeads<T extends LeadTableFilterableLead>(
    leads: readonly T[],
    sortKey: LeadTableSortKey
): readonly T[] {
    const sortableLeads = sortKey === 'priority_only'
        ? leads.filter(lead => lead.grade === 'HOT')
        : leads;

    return [...sortableLeads].sort((a, b) => {
        if (sortKey === 'disclosure_recent') return getDisclosureTime(b.disclosureSummary?.latestSentAt) - getDisclosureTime(a.disclosureSummary?.latestSentAt);
        if (sortKey === 'disclosure_eligible') return getDisclosureEligibleSortValue(a) - getDisclosureEligibleSortValue(b);
        if (sortKey === 'created_asc') return getCreatedTime(a) - getCreatedTime(b);
        if (sortKey === 'budget_asc') return getLeadBudgetSortValue(a) - getLeadBudgetSortValue(b);
        if (sortKey === 'budget_desc') return getLeadBudgetSortValue(b) - getLeadBudgetSortValue(a);
        return getCreatedTime(b) - getCreatedTime(a);
    });
}
