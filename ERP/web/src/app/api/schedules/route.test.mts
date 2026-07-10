import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from '@/lib/api-auth';

type JsonRecord = Record<string, unknown>;
type Filter = {
    readonly kind: 'eq' | 'gte' | 'is' | 'lte';
    readonly column: string;
    readonly value: unknown;
};
type Mutation = {
    readonly operation: 'insert' | 'update';
    readonly table: string;
    readonly payload: JsonRecord;
};
type FakeState = {
    readonly filters: Filter[];
    readonly mutations: Mutation[];
    readonly rows: Record<string, readonly JsonRecord[]>;
};
type SchedulesRouteModule = {
    readonly handleSchedulesGET: (request: Request, dependencies: ReturnType<typeof createDependencies>) => Promise<Response>;
    readonly handleSchedulesPOST: (request: Request, dependencies: ReturnType<typeof createDependencies>) => Promise<Response>;
    readonly handleSchedulesPUT: (request: Request, dependencies: ReturnType<typeof createDependencies>) => Promise<Response>;
};

const managerId = '11111111-1111-4111-8111-111111111111';
const requester: RequesterProfile = {
    company_id: 'company-1',
    id: managerId,
    role: 'manager'
};
const routeImport = (await import('./route.js')) as unknown as Partial<SchedulesRouteModule> & {
    readonly default?: SchedulesRouteModule;
};
const routeModule = routeImport.default || routeImport as SchedulesRouteModule;
const {
    handleSchedulesGET,
    handleSchedulesPOST,
    handleSchedulesPUT
} = routeModule;

function createState(rows: Record<string, readonly JsonRecord[]>): FakeState {
    return {
        filters: [],
        mutations: [],
        rows
    };
}

function matches(row: JsonRecord, filters: readonly Filter[]): boolean {
    return filters.every(filter => {
        if (filter.kind === 'is') return row[filter.column] === filter.value;
        if (filter.kind === 'gte') return String(row[filter.column] || '') >= String(filter.value || '');
        if (filter.kind === 'lte') return String(row[filter.column] || '') <= String(filter.value || '');
        return row[filter.column] === filter.value;
    });
}

class FakeQuery {
    private readonly filters: Filter[] = [];
    private readonly orders: string[] = [];

    constructor(
        private readonly state: FakeState,
        private readonly table: string,
        private readonly operation: 'select' | 'insert' | 'update',
        private readonly payload: JsonRecord = {}
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

    lte(column: string, value: unknown): this {
        this.filters.push({ column, kind: 'lte', value });
        this.state.filters.push({ column, kind: 'lte', value });
        return this;
    }

    limit(): this {
        return this;
    }

    order(column: string): this {
        this.orders.push(column);
        return this;
    }

    select(): this {
        return this;
    }

    single<T = JsonRecord>(): Promise<{ readonly data: T | null; readonly error: null }> {
        const data = this.apply()[0] || null;
        return Promise.resolve({ data: data as T | null, error: null });
    }

    maybeSingle<T = JsonRecord>(): Promise<{ readonly data: T | null; readonly error: null }> {
        const data = this.apply()[0] || null;
        return Promise.resolve({ data: data as T | null, error: null });
    }

    then<TResult1 = { readonly data: readonly JsonRecord[]; readonly error: null }, TResult2 = never>(
        onfulfilled?: ((value: { readonly data: readonly JsonRecord[]; readonly error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return Promise.resolve({ data: this.apply(), error: null }).then(onfulfilled, onrejected);
    }

    private apply(): readonly JsonRecord[] {
        if (this.operation === 'insert' || this.operation === 'update') {
            this.state.mutations.push({ operation: this.operation, payload: this.payload, table: this.table });
            return [{
                ...this.payload,
                company: { name: 'Company 1' },
                user: { name: 'Manager' }
            }];
        }
        return (this.state.rows[this.table] || []).filter(row => matches(row, this.filters));
    }
}

class FakeTable {
    constructor(
        private readonly state: FakeState,
        private readonly table: string
    ) {}

    insert(payload: JsonRecord): FakeQuery {
        return new FakeQuery(this.state, this.table, 'insert', payload);
    }

    select(): FakeQuery {
        return new FakeQuery(this.state, this.table, 'select');
    }

    update(payload: JsonRecord): FakeQuery {
        return new FakeQuery(this.state, this.table, 'update', payload);
    }
}

function createDependencies(state: FakeState, resolvedRequester: RequesterProfile | null = requester) {
    const supabase = {
        from(table: string): FakeTable {
            return new FakeTable(state, table);
        }
    };
    return {
        getSupabaseAdmin: () => supabase as never,
        resolveRequester: async () => resolvedRequester
    };
}

function readPayload(response: Response): Promise<JsonRecord> {
    return response.json() as Promise<JsonRecord>;
}

test('Given legacy schedule GET When source-linked rows exist Then source_type null is queried and only legacy rows return', async () => {
    const state = createState({
        schedules: [
            {
                company_id: 'company-1',
                date: '2026-07-10',
                id: 'legacy-1',
                scope: 'company',
                source_type: null,
                title: '점포 미팅',
                user_id: managerId
            },
            {
                company_id: 'company-1',
                date: '2026-07-10',
                id: 'source-1',
                scope: 'company',
                source_type: 'approval-document',
                title: '결재 업무',
                user_id: managerId
            }
        ]
    });
    const response = await handleSchedulesGET(new Request('http://localhost/api/schedules'), createDependencies(state));
    const payload = await readPayload(response);
    const data = payload.data as readonly JsonRecord[];

    assert.equal(response.status, 200);
    assert.deepEqual(data.map(row => row.id), ['legacy-1']);
    assert.ok(state.filters.some(filter => filter.kind === 'is' && filter.column === 'source_type' && filter.value === null));
});

test('Given source fields When creating a legacy schedule Then request is rejected before mutation', async () => {
    const state = createState({});
    const response = await handleSchedulesPOST(new Request('http://localhost/api/schedules', {
        body: JSON.stringify({
            companyId: 'company-1',
            date: '2026-07-10',
            sourceId: 'doc-1',
            sourceType: 'approval-document',
            title: '결재 업무',
            userId: managerId
        }),
        method: 'POST'
    }), createDependencies(state));
    const payload = await readPayload(response);

    assert.equal(response.status, 400);
    assert.equal(payload.code, 'VALIDATION_ERROR');
    assert.equal(state.mutations.length, 0);
});

test('Given workflow fields When updating a legacy schedule Then request is rejected before mutation', async () => {
    const state = createState({
        schedules: [{
            company_id: 'company-1',
            id: 'legacy-1',
            scope: 'company',
            source_type: null,
            user_id: managerId
        }]
    });
    const response = await handleSchedulesPUT(new Request('http://localhost/api/schedules', {
        body: JSON.stringify({
            dueAt: '2026-07-11T00:00:00.000Z',
            id: 'legacy-1',
            title: '수정',
            userId: managerId
        }),
        method: 'PUT'
    }), createDependencies(state));
    const payload = await readPayload(response);

    assert.equal(response.status, 400);
    assert.equal(payload.code, 'VALIDATION_ERROR');
    assert.equal(state.mutations.length, 0);
});

test('Given manual payload When creating and updating Then legacy contract succeeds', async () => {
    const state = createState({
        profiles: [{
            company_id: 'company-1',
            id: managerId,
            status: 'active'
        }],
        schedules: [{
            company_id: 'company-1',
            id: 'legacy-1',
            scope: 'company',
            source_type: null,
            user_id: managerId
        }]
    });
    const createResponse = await handleSchedulesPOST(new Request('http://localhost/api/schedules', {
        body: JSON.stringify({
            companyId: 'company-1',
            date: '2026-07-10',
            scope: 'company',
            title: '점포 미팅',
            userId: managerId
        }),
        method: 'POST'
    }), createDependencies(state));
    const updateResponse = await handleSchedulesPUT(new Request('http://localhost/api/schedules', {
        body: JSON.stringify({
            date: '2026-07-11',
            id: 'legacy-1',
            title: '점포 미팅 수정',
            userId: managerId
        }),
        method: 'PUT'
    }), createDependencies(state));

    assert.equal(createResponse.status, 201);
    assert.equal(updateResponse.status, 200);
    assert.deepEqual(state.mutations.map(mutation => mutation.operation), ['insert', 'update']);
});
