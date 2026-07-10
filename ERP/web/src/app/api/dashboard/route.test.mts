import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from '@/lib/api-auth';

type JsonRecord = Record<string, unknown>;
type Filter = {
    readonly kind: 'eq' | 'gte' | 'is' | 'not';
    readonly column: string;
    readonly value: unknown;
};
type FakeState = {
    readonly filters: Filter[];
    readonly rows: Record<string, readonly JsonRecord[]>;
};
type DashboardRouteModule = {
    readonly handleDashboardGET: (request: Request, dependencies: ReturnType<typeof createDependencies>) => Promise<Response>;
};

const requester: RequesterProfile = {
    company_id: 'company-1',
    id: '11111111-1111-4111-8111-111111111111',
    role: 'manager'
};
const routeImport = (await import('./route.js')) as unknown as Partial<DashboardRouteModule> & {
    readonly default?: DashboardRouteModule;
};
const routeModule = routeImport.default || routeImport as DashboardRouteModule;
const { handleDashboardGET } = routeModule;

function createState(rows: Record<string, readonly JsonRecord[]>): FakeState {
    return {
        filters: [],
        rows
    };
}

function matches(row: JsonRecord, filters: readonly Filter[]): boolean {
    return filters.every(filter => {
        if (filter.kind === 'is') return row[filter.column] === filter.value;
        if (filter.kind === 'gte') return String(row[filter.column] || '') >= String(filter.value || '');
        if (filter.kind === 'not' && filter.column === 'type') {
            return !String(filter.value || '').includes(String(row.type || ''));
        }
        return row[filter.column] === filter.value;
    });
}

class FakeQuery {
    private readonly filters: Filter[] = [];

    constructor(
        private readonly state: FakeState,
        private readonly table: string,
        private readonly options: { readonly count?: 'exact'; readonly head?: boolean } = {}
    ) {}

    eq(column: string, value: unknown): this {
        this.filters.push({ column, kind: 'eq', value });
        this.state.filters.push({ column, kind: 'eq', value });
        return this;
    }

    gte(column: string, value: unknown): this {
        this.filters.push({ column, kind: 'gte', value });
        this.state.filters.push({ column, kind: 'gte', value });
        return this;
    }

    is(column: string, value: unknown): this {
        this.filters.push({ column, kind: 'is', value });
        this.state.filters.push({ column, kind: 'is', value });
        return this;
    }

    limit(): this {
        return this;
    }

    not(column: string, operator: string, value: unknown): this {
        this.filters.push({ column, kind: 'not', value: `${operator}:${String(value)}` });
        this.state.filters.push({ column, kind: 'not', value: `${operator}:${String(value)}` });
        return this;
    }

    order(): this {
        return this;
    }

    then<TResult1 = { readonly data: readonly JsonRecord[]; readonly count: number | null; readonly error: null }, TResult2 = never>(
        onfulfilled?: ((value: { readonly data: readonly JsonRecord[]; readonly count: number | null; readonly error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        const data = (this.state.rows[this.table] || []).filter(row => matches(row, this.filters));
        return Promise.resolve({
            count: this.options.count === 'exact' ? data.length : null,
            data: this.options.head ? [] : data,
            error: null
        }).then(onfulfilled, onrejected);
    }
}

class FakeTable {
    constructor(
        private readonly state: FakeState,
        private readonly table: string
    ) {}

    select(_columns: string, options: { readonly count?: 'exact'; readonly head?: boolean } = {}): FakeQuery {
        return new FakeQuery(this.state, this.table, options);
    }
}

function createDependencies(state: FakeState, resolvedRequester: RequesterProfile | null = requester) {
    const supabase = {
        from(table: string): FakeTable {
            return new FakeTable(state, table);
        }
    };
    return {
        getContracts: async () => [],
        getSupabaseAdmin: () => supabase as never,
        resolveRequester: async () => resolvedRequester
    };
}

function readPayload(response: Response): Promise<JsonRecord> {
    return response.json() as Promise<JsonRecord>;
}

test('Given dashboard schedules When source-linked rows exist Then widget query filters source_type null', async () => {
    const todayKey = new Intl.DateTimeFormat('en-CA', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'Asia/Seoul',
        year: 'numeric'
    }).format(new Date());
    const state = createState({
        contracts: [],
        customers: [{ id: 'customer-1' }],
        properties: [],
        schedules: [
            {
                company_id: 'company-1',
                date: todayKey,
                id: 'legacy-1',
                scope: 'company',
                source_type: null,
                title: '점포 미팅',
                type: 'schedule',
                user_id: requester.id
            },
            {
                company_id: 'company-1',
                date: todayKey,
                id: 'source-1',
                scope: 'company',
                source_type: 'approval-document',
                title: '결재 업무',
                type: 'schedule',
                user_id: requester.id
            }
        ]
    });
    const response = await handleDashboardGET(new Request('http://localhost/api/dashboard'), createDependencies(state));
    const payload = await readPayload(response);
    const data = payload as {
        readonly stats: { readonly scheduleCount: number };
        readonly todaySchedules: readonly JsonRecord[];
    };

    assert.equal(response.status, 200);
    assert.equal(data.stats.scheduleCount, 1);
    assert.deepEqual(data.todaySchedules.map(row => row.id), ['legacy-1']);
    assert.ok(state.filters.some(filter => filter.kind === 'is' && filter.column === 'source_type' && filter.value === null));
});
