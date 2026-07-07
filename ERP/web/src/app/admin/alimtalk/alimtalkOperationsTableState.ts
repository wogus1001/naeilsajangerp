import type { AlimtalkCompanyUsageSummary } from '@/lib/alimtalk-operations';

export type AlimtalkUsageFilter = 'all' | 'enabled' | 'disabled' | 'used' | 'failed' | 'limit_warning';
export type AlimtalkUsageSortKey = 'companyName' | 'total' | 'success' | 'failed' | 'recentSentAt';
export type AlimtalkSortDirection = 'asc' | 'desc';

export type AlimtalkUsageTableState = {
    readonly query: string;
    readonly filter: AlimtalkUsageFilter;
    readonly sortKey: AlimtalkUsageSortKey;
    readonly sortDirection: AlimtalkSortDirection;
};

export function parseAlimtalkUsageFilter(value: string): AlimtalkUsageFilter {
    switch (value) {
        case 'enabled':
        case 'disabled':
        case 'used':
        case 'failed':
        case 'limit_warning':
            return value;
        default:
            return 'all';
    }
}

export function parseAlimtalkUsageSortKey(value: string): AlimtalkUsageSortKey {
    switch (value) {
        case 'companyName':
        case 'success':
        case 'failed':
        case 'recentSentAt':
            return value;
        default:
            return 'total';
    }
}

export function parseAlimtalkSortDirection(value: string): AlimtalkSortDirection {
    return value === 'asc' ? 'asc' : 'desc';
}

function isNearLimit(item: AlimtalkCompanyUsageSummary): boolean {
    if (item.monthlyLimit === null || item.warningThreshold === null) return false;
    return item.total >= item.warningThreshold && item.total <= item.monthlyLimit;
}

function matchesFilter(item: AlimtalkCompanyUsageSummary, filter: AlimtalkUsageFilter): boolean {
    switch (filter) {
        case 'all':
            return true;
        case 'enabled':
            return item.enabled;
        case 'disabled':
            return !item.enabled;
        case 'used':
            return item.total > 0;
        case 'failed':
            return item.failed > 0;
        case 'limit_warning':
            return isNearLimit(item);
    }
}

function matchesQuery(item: AlimtalkCompanyUsageSummary, query: string): boolean {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
    if (!normalizedQuery) return true;
    return `${item.companyName} ${item.companyId}`.toLocaleLowerCase('ko-KR').includes(normalizedQuery);
}

function sortValue(item: AlimtalkCompanyUsageSummary, key: AlimtalkUsageSortKey): string | number {
    switch (key) {
        case 'companyName':
            return item.companyName;
        case 'success':
            return item.success;
        case 'failed':
            return item.failed;
        case 'recentSentAt':
            return item.recentSentAt;
        case 'total':
            return item.total;
    }
}

function compareValues(left: string | number, right: string | number): number {
    if (typeof left === 'number' && typeof right === 'number') return left - right;
    return String(left).localeCompare(String(right), 'ko-KR');
}

export function filterAndSortAlimtalkUsage(
    usage: readonly AlimtalkCompanyUsageSummary[],
    state: AlimtalkUsageTableState
): readonly AlimtalkCompanyUsageSummary[] {
    return usage
        .filter(item => matchesQuery(item, state.query))
        .filter(item => matchesFilter(item, state.filter))
        .toSorted((left, right) => {
            const comparison = compareValues(sortValue(left, state.sortKey), sortValue(right, state.sortKey));
            return state.sortDirection === 'asc' ? comparison : -comparison;
        });
}

export function pageAlimtalkUsage<T>(items: readonly T[], page: number, pageSize: number): readonly T[] {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const start = (safePage - 1) * safePageSize;
    return items.slice(start, start + safePageSize);
}
