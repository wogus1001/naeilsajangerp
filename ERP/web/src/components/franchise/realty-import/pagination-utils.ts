export const DEFAULT_REALTY_PAGE_SIZE = 50;
export const REALTY_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function getPageItems<T>(items: readonly T[], page: number, pageSize: number): readonly T[] {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
}
