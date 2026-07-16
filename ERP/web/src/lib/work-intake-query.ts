export type WorkIntakePageMeta = {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly pageCount: number;
};

export type WorkIntakeQuery = {
    readonly search: string;
    readonly status: string;
    readonly from: string;
    readonly to: string;
    readonly page: number;
    readonly pageSize: number;
};

type WorkIntakeFilterAdapter<T> = {
    readonly getSearchFields: (item: T) => readonly string[];
    readonly getStatus: (item: T) => string;
    readonly getDate: (item: T) => string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function cleanText(value: string | null): string {
    return (value || '').replace(/\s+/g, ' ').trim();
}

function readPositiveInteger(value: string | null, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return parsed;
}

function normalizeDate(value: string): string {
    return cleanText(value).slice(0, 10);
}

function isInDateRange(value: string, from: string, to: string): boolean {
    const date = normalizeDate(value);
    if (!date) return false;
    if (from && date < from) return false;
    return !(to && date > to);
}

function matchesSearch(fields: readonly string[], search: string): boolean {
    if (!search) return true;
    const normalizedSearch = search.toLocaleLowerCase('ko-KR');
    return fields.some(field => field.toLocaleLowerCase('ko-KR').includes(normalizedSearch));
}

export function parseWorkIntakeQuery(searchParams: URLSearchParams): WorkIntakeQuery {
    const requestedPageSize = readPositiveInteger(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    return {
        search: cleanText(searchParams.get('search')),
        status: cleanText(searchParams.get('status')),
        from: normalizeDate(cleanText(searchParams.get('from'))),
        to: normalizeDate(cleanText(searchParams.get('to'))),
        page: readPositiveInteger(searchParams.get('page'), DEFAULT_PAGE),
        pageSize: Math.min(requestedPageSize, MAX_PAGE_SIZE)
    };
}

export function paginateWorkIntakeItems<T>(
    items: readonly T[],
    query: WorkIntakeQuery,
    adapter: WorkIntakeFilterAdapter<T>
): { readonly items: readonly T[]; readonly meta: WorkIntakePageMeta } {
    const filtered = items.filter(item => {
        if (query.status && adapter.getStatus(item) !== query.status) return false;
        if ((query.from || query.to) && !isInDateRange(adapter.getDate(item), query.from, query.to)) return false;
        return matchesSearch(adapter.getSearchFields(item), query.search);
    });
    const pageCount = Math.max(1, Math.ceil(filtered.length / query.pageSize));
    const page = Math.min(query.page, pageCount);
    const start = (page - 1) * query.pageSize;
    return {
        items: filtered.slice(start, start + query.pageSize),
        meta: {
            page,
            pageSize: query.pageSize,
            total: filtered.length,
            pageCount
        }
    };
}
