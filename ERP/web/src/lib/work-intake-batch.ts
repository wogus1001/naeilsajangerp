const DEFAULT_DATABASE_PAGE_SIZE = 1_000;

export async function fetchAllWorkIntakeRows<T>(
    loadBatch: (from: number, to: number) => Promise<readonly T[]>,
    pageSize = DEFAULT_DATABASE_PAGE_SIZE
): Promise<readonly T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += pageSize) {
        const batch = await loadBatch(from, from + pageSize - 1);
        rows.push(...batch);
        if (batch.length < pageSize) return rows;
    }
}
