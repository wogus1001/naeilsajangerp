import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from '@/lib/api-auth';

type JsonRecord = Record<string, unknown>;
type TestDependencies = {
    readonly getSupabaseAdmin: () => unknown;
    readonly resolveRequester: () => Promise<RequesterProfile | null>;
};
type RouteHandler = (request: Request, dependencies: TestDependencies) => Promise<Response>;
type HandlerExports = {
    readonly handleFranchiseSchedulesDELETE: RouteHandler;
    readonly handleFranchiseSchedulesGET: RouteHandler;
    readonly handleFranchiseSchedulesPATCH: RouteHandler;
    readonly handleFranchiseSchedulesPOST: RouteHandler;
};
type UnknownFunction = (...args: readonly unknown[]) => unknown;
type QueryFilter = {
    readonly column: string;
    readonly operator: 'eq' | 'gte' | 'in' | 'is' | 'lte';
    readonly value: unknown;
};
type MutationLog = {
    readonly operation: 'delete' | 'insert' | 'update';
    readonly payload: JsonRecord;
    readonly table: string;
};
type FakeState = {
    readonly approvalSteps: Record<string, JsonRecord>;
    readonly filters: QueryFilter[];
    readonly mutations: MutationLog[];
    readonly profiles: Record<string, JsonRecord>;
    readonly schedules: Record<string, JsonRecord>;
    readonly schemaMissing?: boolean;
    readonly visibilityMissing?: boolean;
};

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownFunction(value: unknown): value is UnknownFunction {
    return typeof value === 'function';
}

function loadHandlerExports(value: unknown): HandlerExports {
    const moduleRecord = isRecord(value) ? value : {};
    const candidate = isRecord(moduleRecord.default) ? moduleRecord.default : moduleRecord;
    const readHandler = (key: keyof HandlerExports): RouteHandler => {
        const handler = candidate[key];
        if (!isUnknownFunction(handler)) throw new Error(`Missing handler export ${key}`);
        const callable = handler;
        return async (requestValue, dependenciesValue) => {
            const response = await callable(requestValue, dependenciesValue);
            if (response instanceof Response) return response;
            throw new Error(`Handler ${key} did not return a Response`);
        };
    };
    return {
        handleFranchiseSchedulesDELETE: readHandler('handleFranchiseSchedulesDELETE'),
        handleFranchiseSchedulesGET: readHandler('handleFranchiseSchedulesGET'),
        handleFranchiseSchedulesPATCH: readHandler('handleFranchiseSchedulesPATCH'),
        handleFranchiseSchedulesPOST: readHandler('handleFranchiseSchedulesPOST')
    };
}

const {
    handleFranchiseSchedulesDELETE,
    handleFranchiseSchedulesGET,
    handleFranchiseSchedulesPATCH,
    handleFranchiseSchedulesPOST
} = loadHandlerExports(await import('./handlers.js'));

const manager: RequesterProfile = { company_id: 'company-1', id: 'manager-1', role: 'manager' };
const staff: RequesterProfile = { company_id: 'company-1', id: 'staff-1', role: 'staff' };
const inactiveRequester: RequesterProfile = { company_id: 'company-1', id: 'inactive-requester', role: 'manager' };
const partnerVendor: RequesterProfile = { company_id: 'company-1', id: 'partner-1', role: 'partner_vendor' };

function createState(overrides: Partial<FakeState> = {}): FakeState {
    return {
        approvalSteps: {},
        filters: [],
        mutations: [],
        profiles: {
            'inactive-requester': { company_id: 'company-1', id: 'inactive-requester', role: 'manager', status: 'inactive' },
            'inactive-target': { company_id: 'company-1', id: 'inactive-target', role: 'staff', status: 'inactive' },
            'manager-1': { company_id: 'company-1', id: 'manager-1', role: 'manager', status: 'active' },
            'manager-2': { company_id: 'company-2', id: 'manager-2', role: 'manager', status: 'active' },
            'partner-1': { company_id: 'company-1', id: 'partner-1', role: 'partner_vendor', status: 'active' },
            'staff-1': { company_id: 'company-1', id: 'staff-1', role: 'staff', status: 'active' }
        },
        schedules: {
            'manual-1': scheduleRow({ id: 'manual-1' }),
            'source-1': scheduleRow({
                id: 'source-1',
                source_id: 'doc-1',
                source_type: 'approval-document'
            })
        },
        ...overrides
    };
}

function scheduleRow(overrides: JsonRecord = {}): JsonRecord {
    return {
        assignee_profile_id: 'staff-1',
        color: null,
        company_id: 'company-1',
        completed_at: null,
        created_at: '2026-07-10T00:00:00.000Z',
        creator_profile_id: 'manager-1',
        date: '2026-07-12',
        details: null,
        due_at: null,
        id: 'manual-1',
        manager_profile_id: 'manager-1',
        metadata: {},
        remind_at: null,
        source_id: null,
        source_type: null,
        status: '예정',
        title: 'Manual schedule',
        type: null,
        updated_at: '2026-07-10T00:00:00.000Z',
        visibility: 'shared',
        ...overrides
    };
}

function matches(row: JsonRecord, filter: QueryFilter): boolean {
    const rowValue = row[filter.column];
    switch (filter.operator) {
        case 'eq':
            return rowValue === filter.value;
        case 'gte':
            return String(rowValue ?? '') >= String(filter.value ?? '');
        case 'is':
            return rowValue === filter.value;
        case 'in':
            return Array.isArray(filter.value) && filter.value.includes(rowValue);
        case 'lte':
            return String(rowValue ?? '') <= String(filter.value ?? '');
    }
}

function rowsForTable(state: FakeState, table: string): readonly JsonRecord[] {
    if (table === 'approval_delegations') return [];
    if (table === 'approval_document_steps') return Object.values(state.approvalSteps);
    if (table === 'profiles') return Object.values(state.profiles);
    if (table === 'franchise_schedules') return Object.values(state.schedules);
    return [];
}

function selectRows(state: FakeState, table: string, filters: readonly QueryFilter[]): readonly JsonRecord[] {
    return rowsForTable(state, table).filter(row => filters.every(filter => matches(row, filter)));
}

function schemaError() {
    return {
        code: '42P01',
        message: 'relation "franchise_schedules" does not exist'
    };
}

function visibilitySchemaError() {
    return {
        code: 'PGRST204',
        message: "Could not find the 'visibility' column of 'franchise_schedules' in the schema cache"
    };
}

class FakeSelectQuery {
    private readonly filters: QueryFilter[] = [];

    constructor(
        private readonly state: FakeState,
        private readonly table: string
    ) {}

    eq(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'eq', value });
        this.state.filters.push({ column, operator: 'eq', value });
        return this;
    }

    gte(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'gte', value });
        this.state.filters.push({ column, operator: 'gte', value });
        return this;
    }

    is(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'is', value });
        this.state.filters.push({ column, operator: 'is', value });
        return this;
    }

    in(column: string, value: readonly unknown[]): this {
        this.filters.push({ column, operator: 'in', value });
        return this;
    }

    lte(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'lte', value });
        this.state.filters.push({ column, operator: 'lte', value });
        return this;
    }

    order(): this {
        return this;
    }

    returns(): this {
        return this;
    }

    async maybeSingle() {
        if (this.state.schemaMissing && this.table === 'franchise_schedules') return { data: null, error: schemaError() };
        if (this.state.visibilityMissing && this.table === 'franchise_schedules') return { data: null, error: visibilitySchemaError() };
        return { data: selectRows(this.state, this.table, this.filters)[0] || null, error: null };
    }

    async single() {
        return this.maybeSingle();
    }

    then<TResult1 = { readonly data: readonly JsonRecord[]; readonly error: JsonRecord | null }, TResult2 = never>(
        onfulfilled?: ((value: { readonly data: readonly JsonRecord[]; readonly error: JsonRecord | null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        const value = this.state.schemaMissing && this.table === 'franchise_schedules'
            ? { data: [], error: schemaError() }
            : this.state.visibilityMissing && this.table === 'franchise_schedules'
                ? { data: [], error: visibilitySchemaError() }
                : { data: selectRows(this.state, this.table, this.filters), error: null };
        return Promise.resolve(value).then(onfulfilled, onrejected);
    }
}

class FakeMutationQuery {
    private readonly filters: QueryFilter[] = [];

    constructor(
        private readonly state: FakeState,
        private readonly table: string,
        private readonly operation: 'delete' | 'insert' | 'update',
        private readonly payload: JsonRecord = {}
    ) {}

    eq(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'eq', value });
        return this;
    }

    select(): this {
        return this;
    }

    async single() {
        const data = this.applyMutation();
        return { data, error: this.state.schemaMissing ? schemaError() : null };
    }

    then<TResult1 = { readonly error: JsonRecord | null }, TResult2 = never>(
        onfulfilled?: ((value: { readonly error: JsonRecord | null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        if (!this.state.schemaMissing) this.applyMutation();
        return Promise.resolve({ error: this.state.schemaMissing ? schemaError() : null }).then(onfulfilled, onrejected);
    }

    private applyMutation(): JsonRecord {
        this.state.mutations.push({ operation: this.operation, payload: this.payload, table: this.table });
        if (this.table !== 'franchise_schedules') return this.payload;
        if (this.operation === 'insert') {
            const id = String(this.payload.id || 'created-id');
            const row = { ...this.payload, id };
            this.state.schedules[id] = row;
            return row;
        }
        const row = selectRows(this.state, this.table, this.filters)[0];
        if (!row) return {};
        const id = String(row.id);
        if (this.operation === 'delete') {
            delete this.state.schedules[id];
            return row;
        }
        const updated = { ...row, ...this.payload };
        this.state.schedules[id] = updated;
        return updated;
    }
}

class FakeTable {
    constructor(
        private readonly state: FakeState,
        private readonly table: string
    ) {}

    delete(): FakeMutationQuery {
        return new FakeMutationQuery(this.state, this.table, 'delete');
    }

    insert(payload: JsonRecord): FakeMutationQuery {
        return new FakeMutationQuery(this.state, this.table, 'insert', payload);
    }

    select(): FakeSelectQuery {
        return new FakeSelectQuery(this.state, this.table);
    }

    update(payload: JsonRecord): FakeMutationQuery {
        return new FakeMutationQuery(this.state, this.table, 'update', payload);
    }
}

function createDependencies(state: FakeState, resolvedRequester: RequesterProfile | null = manager) {
    const supabase = {
        from(table: string): FakeTable {
            return new FakeTable(state, table);
        }
    };
    return {
        getSupabaseAdmin: () => supabase,
        resolveRequester: async () => resolvedRequester
    };
}

async function json(response: Response): Promise<JsonRecord> {
    const value: unknown = await response.json();
    return isRecord(value) ? value : {};
}

function request(method: string, body: JsonRecord = {}, url = 'http://localhost/api/franchise-schedules'): Request {
    return new Request(url, {
        body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
        method
    });
}

test('Given no authenticated requester When listing schedules Then the route returns 401', async () => {
    const response = await handleFranchiseSchedulesGET(request('GET'), createDependencies(createState(), null));
    const payload = await json(response);

    assert.equal(response.status, 401);
    assert.equal(payload.code, 'AUTH_REQUIRED');
});

test('Given inactive requester When using every method Then all reads and mutations are rejected', async () => {
    const state = createState();
    const deps = createDependencies(state, inactiveRequester);
    const responses = await Promise.all([
        handleFranchiseSchedulesGET(request('GET'), deps),
        handleFranchiseSchedulesPOST(request('POST', { date: '2026-07-12', title: 'x' }), deps),
        handleFranchiseSchedulesPATCH(request('PATCH', { id: 'manual-1', title: 'x' }), deps),
        handleFranchiseSchedulesPATCH(request('PATCH', { id: 'manual-1' }, 'http://localhost/api/franchise-schedules?action=complete'), deps),
        handleFranchiseSchedulesDELETE(request('DELETE', {}, 'http://localhost/api/franchise-schedules?id=manual-1'), deps)
    ]);

    assert.deepEqual(responses.map(response => response.status), [403, 403, 403, 403, 403]);
    assert.equal(state.mutations.length, 0);
});

test('Given partner vendor requester When using every method Then franchise staff schedules remain inaccessible', async () => {
    const state = createState();
    const deps = createDependencies(state, partnerVendor);
    const responses = await Promise.all([
        handleFranchiseSchedulesGET(request('GET'), deps),
        handleFranchiseSchedulesPOST(request('POST', { date: '2026-07-12', title: 'x' }), deps),
        handleFranchiseSchedulesPATCH(request('PATCH', { id: 'manual-1', title: 'x' }), deps),
        handleFranchiseSchedulesDELETE(request('DELETE', {}, 'http://localhost/api/franchise-schedules?id=manual-1'), deps)
    ]);

    assert.deepEqual(responses.map(response => response.status), [403, 403, 403, 403]);
    assert.equal(state.mutations.length, 0);
});

test('Given manager filters When listing schedules Then company scope and filters are applied', async () => {
    const state = createState();
    const response = await handleFranchiseSchedulesGET(
        request('GET', {}, 'http://localhost/api/franchise-schedules?dateFrom=2026-07-01&dateTo=2026-07-31&status=예정&source=manual&assigneeProfileId=staff-1&managerProfileId=manager-1'),
        createDependencies(state)
    );

    assert.equal(response.status, 200);
    assert.deepEqual(state.filters.filter(filter => filter.column !== 'id'), [
        { column: 'id', operator: 'eq', value: 'manager-1' },
        { column: 'company_id', operator: 'eq', value: 'company-1' },
        { column: 'date', operator: 'gte', value: '2026-07-01' },
        { column: 'date', operator: 'lte', value: '2026-07-31' },
        { column: 'status', operator: 'eq', value: '예정' },
        { column: 'source_type', operator: 'is', value: null },
        { column: 'assignee_profile_id', operator: 'eq', value: 'staff-1' },
        { column: 'manager_profile_id', operator: 'eq', value: 'manager-1' }
    ].filter(filter => filter.column !== 'id'));
});

test('Given shared and personal schedules When listing Then another users personal schedule is hidden', async () => {
    const state = createState({
        schedules: {
            shared: scheduleRow({ id: 'shared', visibility: 'shared' }),
            own: scheduleRow({ creator_profile_id: 'manager-1', id: 'own', visibility: 'personal' }),
            other: scheduleRow({ creator_profile_id: 'staff-1', id: 'other', visibility: 'personal' })
        }
    });
    const response = await handleFranchiseSchedulesGET(request('GET'), createDependencies(state));
    const payload = await json(response);
    const data = Array.isArray(payload.data) ? payload.data : [];

    assert.equal(response.status, 200);
    assert.deepEqual(data.map(row => isRecord(row) ? row.id : '').sort(), ['own', 'shared']);
});

test('Given mirrored approval schedules When listing Then only current targets can read them', async () => {
    const state = createState({
        approvalSteps: {
            visible: {
                action_kind: 'approval',
                company_id: 'company-1',
                document_id: 'document-1',
                responses: [],
                status: 'active',
                targets: [{ profile_id: 'staff-1', delegate_profile_ids: [] }]
            },
            hidden: {
                action_kind: 'approval',
                company_id: 'company-1',
                document_id: 'document-2',
                responses: [],
                status: 'active',
                targets: [{ profile_id: 'manager-1', delegate_profile_ids: [] }]
            }
        },
        schedules: {
            visible: scheduleRow({
                assignee_profile_id: null,
                creator_profile_id: null,
                id: 'visible',
                metadata: { targetProfileIds: ['staff-1'] },
                source_id: 'document-1',
                source_type: 'approval-document',
                visibility: 'shared'
            }),
            hidden: scheduleRow({
                assignee_profile_id: null,
                creator_profile_id: 'staff-1',
                id: 'hidden',
                metadata: { targetProfileIds: ['manager-1'] },
                source_id: 'document-2',
                source_type: 'approval-document',
                visibility: 'shared'
            })
        }
    });
    const response = await handleFranchiseSchedulesGET(request('GET'), createDependencies(state, staff));
    const payload = await json(response);
    const data = Array.isArray(payload.data) ? payload.data : [];

    assert.equal(response.status, 200);
    assert.deepEqual(data.map(row => isRecord(row) ? row.id : ''), ['visible']);
});

test('Given calendar date aliases When listing schedules Then from and to bounds are applied', async () => {
    const state = createState();
    const response = await handleFranchiseSchedulesGET(
        request('GET', {}, 'http://localhost/api/franchise-schedules?from=2026-07-01&to=2026-07-31'),
        createDependencies(state)
    );

    assert.equal(response.status, 200);
    assert.deepEqual(state.filters.filter(filter => (
        filter.column === 'date' && (filter.operator === 'gte' || filter.operator === 'lte')
    )), [
        { column: 'date', operator: 'gte', value: '2026-07-01' },
        { column: 'date', operator: 'lte', value: '2026-07-31' }
    ]);
});

test('Given malformed create body When creating schedule Then validation fails without mutation', async () => {
    const state = createState();
    const response = await handleFranchiseSchedulesPOST(request('POST', { title: '' }), createDependencies(state));
    const payload = await json(response);

    assert.equal(response.status, 400);
    assert.equal(payload.code, 'VALIDATION_ERROR');
    assert.equal(state.mutations.length, 0);
});

test('Given manager When creating assigning and mutating manual schedule Then CRUD succeeds', async () => {
    const state = createState();
    const deps = createDependencies(state);
    const created = await handleFranchiseSchedulesPOST(request('POST', {
        assigneeProfileId: 'staff-1',
        date: '2026-07-13',
        managerProfileId: 'manager-1',
        title: 'Created schedule'
    }), deps);
    const createdPayload = await json(created);
    assert.ok(isRecord(createdPayload.data));
    const createdId = String(createdPayload.data.id);
    const patched = await handleFranchiseSchedulesPATCH(request('PATCH', {
        id: createdId,
        status: '진행중',
        title: 'Updated schedule'
    }), deps);
    const completed = await handleFranchiseSchedulesPATCH(
        request('PATCH', { id: createdId }, 'http://localhost/api/franchise-schedules?action=complete'),
        deps
    );
    const deleted = await handleFranchiseSchedulesDELETE(
        request('DELETE', {}, `http://localhost/api/franchise-schedules?id=${createdId}`),
        deps
    );

    assert.equal(created.status, 201);
    assert.deepEqual(state.mutations[0]?.payload, {
        assignee_profile_id: 'staff-1',
        color: '#3182f6',
        company_id: 'company-1',
        created_at: state.mutations[0]?.payload.created_at,
        creator_profile_id: 'manager-1',
        date: '2026-07-13',
        details: '',
        due_at: null,
        id: state.mutations[0]?.payload.id,
        manager_profile_id: 'manager-1',
        metadata: {},
        remind_at: null,
        status: '예정',
        title: 'Created schedule',
        type: 'manual',
        updated_at: state.mutations[0]?.payload.updated_at,
        visibility: 'shared'
    });
    assert.equal(patched.status, 200);
    assert.equal(completed.status, 200);
    assert.equal(deleted.status, 200);
    assert.deepEqual(state.mutations.map(mutation => mutation.operation), ['insert', 'update', 'update', 'delete']);
});

test('Given invalid targets When creating or updating Then company and role guards reject them', async () => {
    const inactiveTarget = createState();
    const inactiveResponse = await handleFranchiseSchedulesPOST(request('POST', {
        assigneeProfileId: 'inactive-target',
        date: '2026-07-13',
        title: 'Created schedule'
    }), createDependencies(inactiveTarget));
    const crossCompany = createState();
    const crossCompanyResponse = await handleFranchiseSchedulesPOST(request('POST', {
        assigneeProfileId: 'manager-2',
        date: '2026-07-13',
        title: 'Created schedule'
    }), createDependencies(crossCompany));
    const wrongManagerRole = createState();
    const wrongManagerRoleResponse = await handleFranchiseSchedulesPATCH(request('PATCH', {
        id: 'manual-1',
        managerProfileId: 'staff-1'
    }), createDependencies(wrongManagerRole));

    assert.equal(inactiveResponse.status, 403);
    assert.equal(crossCompanyResponse.status, 403);
    assert.equal(wrongManagerRoleResponse.status, 403);
    assert.equal(inactiveTarget.mutations.length + crossCompany.mutations.length + wrongManagerRole.mutations.length, 0);
});

test('Given staff requester When assigning another member Then it is rejected but own create succeeds', async () => {
    const state = createState();
    const deps = createDependencies(state, staff);
    const rejected = await handleFranchiseSchedulesPOST(request('POST', {
        assigneeProfileId: 'manager-1',
        date: '2026-07-13',
        title: 'Other assignee'
    }), deps);
    const accepted = await handleFranchiseSchedulesPOST(request('POST', {
        date: '2026-07-13',
        title: 'Own schedule'
    }), deps);

    assert.equal(rejected.status, 403);
    assert.equal(accepted.status, 201);
});

test('Given personal schedule When creating Then it is owned and assigned to the requester', async () => {
    const state = createState();
    const response = await handleFranchiseSchedulesPOST(request('POST', {
        date: '2026-07-13',
        title: 'Personal schedule',
        visibility: 'personal'
    }), createDependencies(state));

    assert.equal(response.status, 201);
    assert.equal(state.mutations[0]?.payload.creator_profile_id, 'manager-1');
    assert.equal(state.mutations[0]?.payload.assignee_profile_id, 'manager-1');
    assert.equal(state.mutations[0]?.payload.manager_profile_id, null);
    assert.equal(state.mutations[0]?.payload.visibility, 'personal');
});

test('Given an unsupported visibility When listing creating or updating Then validation rejects it without mutation', async () => {
    const state = createState();
    const deps = createDependencies(state);
    const listed = await handleFranchiseSchedulesGET(
        request('GET', {}, 'http://localhost/api/franchise-schedules?visibility=company'),
        deps
    );
    const created = await handleFranchiseSchedulesPOST(request('POST', {
        date: '2026-07-13',
        title: 'Invalid visibility',
        visibility: 'company'
    }), deps);
    const updated = await handleFranchiseSchedulesPATCH(request('PATCH', {
        id: 'manual-1',
        visibility: 'company'
    }), deps);

    assert.deepEqual([listed.status, created.status, updated.status], [400, 400, 400]);
    assert.equal(state.mutations.length, 0);
});

test('Given another users personal schedule When manager mutates it Then access is denied', async () => {
    const state = createState({
        schedules: {
            private: scheduleRow({ creator_profile_id: 'staff-1', id: 'private', visibility: 'personal' })
        }
    });
    const deps = createDependencies(state);
    const edit = await handleFranchiseSchedulesPATCH(request('PATCH', { id: 'private', title: 'x' }), deps);
    const deleted = await handleFranchiseSchedulesDELETE(request('DELETE', {}, 'http://localhost/api/franchise-schedules?id=private'), deps);

    assert.deepEqual([edit.status, deleted.status], [403, 403]);
    assert.equal(state.mutations.length, 0);
});

test('Given source schedule When edit delete or complete is attempted Then public mutations are forbidden', async () => {
    const state = createState();
    const deps = createDependencies(state);
    const edit = await handleFranchiseSchedulesPATCH(request('PATCH', { id: 'source-1', title: 'x' }), deps);
    const complete = await handleFranchiseSchedulesPATCH(
        request('PATCH', { id: 'source-1' }, 'http://localhost/api/franchise-schedules?action=complete'),
        deps
    );
    const deleted = await handleFranchiseSchedulesDELETE(request('DELETE', {}, 'http://localhost/api/franchise-schedules?id=source-1'), deps);

    assert.deepEqual([edit.status, complete.status, deleted.status], [403, 403, 403]);
    assert.equal(state.mutations.length, 0);
});

test('Given missing franchise schedule schema When listing Then route returns 424 with prepare SQL filename', async () => {
    const response = await handleFranchiseSchedulesGET(request('GET'), createDependencies(createState({ schemaMissing: true })));
    const payload = await json(response);

    assert.equal(response.status, 424);
    assert.match(String(payload.message), /supabase_franchise_schedule_prepare_migration\.sql/);
});

test('Given missing visibility column When listing Then route returns 424 with visibility SQL filename', async () => {
    const response = await handleFranchiseSchedulesGET(request('GET'), createDependencies(createState({ visibilityMissing: true })));
    const payload = await json(response);

    assert.equal(response.status, 424);
    assert.match(String(payload.message), /supabase_franchise_schedule_visibility_migration\.sql/);
});
