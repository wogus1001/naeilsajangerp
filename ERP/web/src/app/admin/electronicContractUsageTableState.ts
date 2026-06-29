import type { ElectronicContractUsageSummary } from '@/lib/electronic-contracts/usage-summary';

export type UsageFilter = 'all' | 'used' | 'zero' | 'in_progress' | 'completed' | 'failed_or_canceled';
export type UsageSortKey = 'companyName' | 'total' | 'draft' | 'inProgress' | 'completed' | 'failedOrCanceled' | 'recentSentAt' | 'recentCompletedAt';
export type SortDirection = 'asc' | 'desc';

export type UsageTableState = {
    readonly query: string;
    readonly filter: UsageFilter;
    readonly sortKey: UsageSortKey;
    readonly sortDirection: SortDirection;
};

export function parseUsageFilter(value: string): UsageFilter {
    switch (value) {
        case 'used':
        case 'zero':
        case 'in_progress':
        case 'completed':
        case 'failed_or_canceled':
            return value;
        default:
            return 'all';
    }
}

export function parseUsageSortKey(value: string): UsageSortKey {
    switch (value) {
        case 'companyName':
        case 'draft':
        case 'inProgress':
        case 'completed':
        case 'failedOrCanceled':
        case 'recentSentAt':
        case 'recentCompletedAt':
            return value;
        default:
            return 'total';
    }
}

export function parseSortDirection(value: string): SortDirection {
    return value === 'asc' ? 'asc' : 'desc';
}

function failedOrCanceled(item: ElectronicContractUsageSummary): number {
    return item.failed + item.canceled;
}

function matchesFilter(item: ElectronicContractUsageSummary, filter: UsageFilter): boolean {
    switch (filter) {
        case 'all':
            return true;
        case 'used':
            return item.total > 0;
        case 'zero':
            return item.total === 0;
        case 'in_progress':
            return item.inProgress > 0;
        case 'completed':
            return item.completed > 0;
        case 'failed_or_canceled':
            return failedOrCanceled(item) > 0;
    }
}

function matchesQuery(item: ElectronicContractUsageSummary, query: string): boolean {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
    if (!normalizedQuery) return true;
    return `${item.companyName} ${item.companyId}`.toLocaleLowerCase('ko-KR').includes(normalizedQuery);
}

function sortValue(item: ElectronicContractUsageSummary, sortKey: UsageSortKey): string | number {
    switch (sortKey) {
        case 'companyName':
            return item.companyName;
        case 'total':
            return item.total;
        case 'draft':
            return item.draft;
        case 'inProgress':
            return item.inProgress;
        case 'completed':
            return item.completed;
        case 'failedOrCanceled':
            return failedOrCanceled(item);
        case 'recentSentAt':
            return item.recentSentAt;
        case 'recentCompletedAt':
            return item.recentCompletedAt;
    }
}

function compareValues(left: string | number, right: string | number): number {
    if (typeof left === 'number' && typeof right === 'number') return left - right;
    return String(left).localeCompare(String(right), 'ko-KR');
}

export function filterAndSortUsage(
    usage: readonly ElectronicContractUsageSummary[],
    state: UsageTableState
): readonly ElectronicContractUsageSummary[] {
    return usage
        .filter(item => matchesQuery(item, state.query))
        .filter(item => matchesFilter(item, state.filter))
        .toSorted((left, right) => {
            const comparison = compareValues(sortValue(left, state.sortKey), sortValue(right, state.sortKey));
            return state.sortDirection === 'asc' ? comparison : -comparison;
        });
}

export function pageItems<T>(items: readonly T[], page: number, pageSize: number): readonly T[] {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const start = (safePage - 1) * safePageSize;
    return items.slice(start, start + safePageSize);
}
