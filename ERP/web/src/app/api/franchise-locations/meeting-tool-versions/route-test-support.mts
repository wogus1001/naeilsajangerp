import assert from 'node:assert/strict';
import type { RequesterProfile } from '@/lib/api-auth';

export type JsonRecord = Record<string, unknown>;

type QueryFilter = {
    readonly column: string;
    readonly value: unknown;
};

type FakeDatabaseError = {
    readonly code: string;
    readonly message: string;
};

type FakeVersionState = {
    readonly inserts: JsonRecord[];
    readonly locations: JsonRecord[];
    readonly tableCalls: string[];
    readonly versions: JsonRecord[];
    insertError?: FakeDatabaseError | null;
    missingVersionsTable?: boolean;
};

type QueryResult<T> = {
    readonly data: T;
    readonly error: FakeDatabaseError | null;
};

export const companyId = '11111111-1111-1111-1111-111111111111';
export const otherCompanyId = '22222222-2222-2222-2222-222222222222';
export const locationId = '33333333-3333-3333-3333-333333333333';
export const otherLocationId = '44444444-4444-4444-4444-444444444444';
export const managerId = '55555555-5555-5555-5555-555555555555';
export const partnerId = '66666666-6666-6666-6666-666666666666';
export const versionId = '77777777-7777-7777-7777-777777777777';

export const managerRequester: RequesterProfile = {
    company_id: companyId,
    id: managerId,
    role: 'manager'
};

export const partnerRequester: RequesterProfile = {
    company_id: companyId,
    id: partnerId,
    role: 'partner_vendor'
};

function createMissingTableError(): FakeDatabaseError {
    return {
        code: '42P01',
        message: 'relation "franchise_location_meeting_tool_versions" does not exist'
    };
}

export function createVersionConflictError(): FakeDatabaseError {
    return {
        code: '23505',
        message: 'duplicate key value violates unique constraint "franchise_location_meeting_tool_versions_location_id_version_number_key"'
    };
}

export function isJsonRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matchesFilters(row: JsonRecord, filters: readonly QueryFilter[]): boolean {
    return filters.every(filter => row[filter.column] === filter.value);
}

function compareValues(left: unknown, right: unknown, ascending: boolean): number {
    const leftValue = typeof left === 'number' ? left : String(left ?? '');
    const rightValue = typeof right === 'number' ? right : String(right ?? '');
    if (leftValue === rightValue) return 0;
    const comparison = leftValue > rightValue ? 1 : -1;
    return ascending ? comparison : -comparison;
}

class FakeSelectQuery {
    private readonly filters: QueryFilter[] = [];
    private orderColumn = '';
    private orderAscending = true;
    private rowLimit: number | null = null;

    constructor(
        private readonly state: FakeVersionState,
        private readonly table: string
    ) {}

    eq(column: string, value: unknown): this {
        this.filters.push({ column, value });
        return this;
    }

    order(column: string, options?: { readonly ascending?: boolean }): this {
        this.orderColumn = column;
        this.orderAscending = options?.ascending !== false;
        return this;
    }

    limit(count: number): this {
        this.rowLimit = count;
        return this;
    }

    returns(): this {
        return this;
    }

    async maybeSingle<T extends JsonRecord = JsonRecord>(): Promise<QueryResult<T | null>> {
        if (this.table === 'franchise_location_meeting_tool_versions' && this.state.missingVersionsTable) {
            return { data: null, error: createMissingTableError() };
        }
        const row = this.selectRows()[0] ?? null;
        return { data: row as T | null, error: null };
    }

    then<TResult1 = QueryResult<readonly JsonRecord[]>, TResult2 = never>(
        onfulfilled?: ((value: QueryResult<readonly JsonRecord[]>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        const value = this.table === 'franchise_location_meeting_tool_versions' && this.state.missingVersionsTable
            ? { data: [], error: createMissingTableError() }
            : { data: this.selectRows(), error: null };
        return Promise.resolve(value).then(onfulfilled, onrejected);
    }

    private selectRows(): readonly JsonRecord[] {
        const rows = this.table === 'franchise_locations' ? this.state.locations : this.state.versions;
        const filtered = rows.filter(row => matchesFilters(row, this.filters));
        const sorted = this.orderColumn
            ? [...filtered].sort((left, right) => compareValues(left[this.orderColumn], right[this.orderColumn], this.orderAscending))
            : filtered;
        return this.rowLimit === null ? sorted : sorted.slice(0, this.rowLimit);
    }
}

class FakeInsertQuery {
    constructor(
        private readonly state: FakeVersionState,
        private readonly payload: JsonRecord
    ) {}

    select(): this {
        return this;
    }

    returns(): this {
        return this;
    }

    async single(): Promise<QueryResult<JsonRecord | null>> {
        if (this.state.missingVersionsTable) {
            return { data: null, error: createMissingTableError() };
        }
        if (this.state.insertError) {
            return { data: null, error: this.state.insertError };
        }
        this.state.inserts.push(this.payload);
        const row = {
            company_id: this.payload.company_id,
            created_at: '2026-06-30T00:00:00.000Z',
            created_by: this.payload.created_by,
            id: versionId,
            location_id: this.payload.location_id,
            meeting_tool: this.payload.meeting_tool,
            title: this.payload.title,
            version_number: this.payload.version_number
        };
        this.state.versions.push(row);
        return { data: row, error: null };
    }
}

class FakeTable {
    constructor(
        private readonly state: FakeVersionState,
        private readonly table: string
    ) {}

    select(): FakeSelectQuery {
        return new FakeSelectQuery(this.state, this.table);
    }

    insert(payload: JsonRecord): FakeInsertQuery {
        return new FakeInsertQuery(this.state, payload);
    }
}

export function createState(overrides: Partial<FakeVersionState> = {}): FakeVersionState {
    return {
        inserts: [],
        locations: [{
            company_id: companyId,
            created_by: managerId,
            id: locationId,
            manager_id: managerId
        }],
        tableCalls: [],
        versions: [],
        ...overrides
    };
}

export function createDependencies(
    state: FakeVersionState,
    resolvedRequester: RequesterProfile | null = managerRequester
) {
    const fakeSupabase = {
        from(table: string): FakeTable {
            state.tableCalls.push(table);
            assert.ok(table === 'franchise_locations' || table === 'franchise_location_meeting_tool_versions');
            return new FakeTable(state, table);
        }
    };
    return {
        getSupabaseAdmin: () => fakeSupabase as never,
        resolveRequester: async () => resolvedRequester
    };
}

export async function readPayload(response: Response): Promise<JsonRecord> {
    const payload: unknown = await response.json();
    return isJsonRecord(payload) ? payload : {};
}

export function createGetRequest(id: string): Request {
    return new Request(`http://localhost/api/franchise-locations/meeting-tool-versions?locationId=${id}`);
}

export function createPostRequest(body: JsonRecord): Request {
    return new Request('http://localhost/api/franchise-locations/meeting-tool-versions', {
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
    });
}
