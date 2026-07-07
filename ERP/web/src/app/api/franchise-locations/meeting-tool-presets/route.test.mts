import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from '@/lib/api-auth';
import {
    handleMeetingToolPresetsDELETE,
    handleMeetingToolPresetsGET,
    handleMeetingToolPresetsPOST
} from './route.js';

type JsonRecord = Record<string, unknown>;
type QueryFilter = {
    readonly column: string;
    readonly value: unknown;
};
type FakeDatabaseError = {
    readonly code: string;
    readonly message: string;
};
type FakePresetState = {
    readonly rows: JsonRecord[];
    readonly upserts: JsonRecord[];
    readonly deletes: QueryFilter[][];
    missingTable?: boolean;
};

const companyId = '11111111-1111-1111-1111-111111111111';
const otherCompanyId = '22222222-2222-2222-2222-222222222222';
const managerId = '33333333-3333-3333-3333-333333333333';
const presetId = '44444444-4444-4444-4444-444444444444';

const requester: RequesterProfile = {
    company_id: companyId,
    id: managerId,
    role: 'manager'
};

function createMissingTableError(): FakeDatabaseError {
    return {
        code: '42P01',
        message: 'relation "franchise_location_meeting_tool_presets" does not exist'
    };
}

function matchesFilters(row: JsonRecord, filters: readonly QueryFilter[]): boolean {
    return filters.every(filter => row[filter.column] === filter.value);
}

function isJsonRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class FakeSelectQuery {
    private readonly filters: QueryFilter[] = [];

    constructor(private readonly state: FakePresetState) {}

    eq(column: string, value: unknown): this {
        this.filters.push({ column, value });
        return this;
    }

    order(): this {
        return this;
    }

    returns(): this {
        return this;
    }

    async maybeSingle(): Promise<{ readonly data: JsonRecord | null; readonly error: FakeDatabaseError | null }> {
        if (this.state.missingTable) return { data: null, error: createMissingTableError() };
        return {
            data: this.state.rows.find(row => matchesFilters(row, this.filters)) || null,
            error: null
        };
    }

    async single(): Promise<{ readonly data: JsonRecord | null; readonly error: FakeDatabaseError | null }> {
        if (this.state.missingTable) return { data: null, error: createMissingTableError() };
        return {
            data: this.state.rows.find(row => matchesFilters(row, this.filters)) || null,
            error: null
        };
    }

    then<TResult1 = { readonly data: readonly JsonRecord[]; readonly error: FakeDatabaseError | null }, TResult2 = never>(
        onfulfilled?: ((value: { readonly data: readonly JsonRecord[]; readonly error: FakeDatabaseError | null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        const value = this.state.missingTable
            ? { data: [], error: createMissingTableError() }
            : { data: this.state.rows.filter(row => matchesFilters(row, this.filters)), error: null };
        return Promise.resolve(value).then(onfulfilled, onrejected);
    }
}

class FakeUpsertQuery {
    constructor(
        private readonly state: FakePresetState,
        private readonly payload: JsonRecord
    ) {}

    select(): this {
        return this;
    }

    returns(): this {
        return this;
    }

    async single(): Promise<{ readonly data: JsonRecord | null; readonly error: FakeDatabaseError | null }> {
        if (this.state.missingTable) return { data: null, error: createMissingTableError() };
        this.state.upserts.push(this.payload);
        const row = {
            id: presetId,
            company_id: this.payload.company_id,
            name: this.payload.name,
            data: this.payload.data,
            created_at: '2026-06-30T00:00:00.000Z',
            updated_at: this.payload.updated_at
        };
        this.state.rows.push(row);
        return { data: row, error: null };
    }
}

class FakeDeleteQuery {
    private readonly filters: QueryFilter[] = [];

    constructor(private readonly state: FakePresetState) {}

    eq(column: string, value: unknown): this {
        this.filters.push({ column, value });
        return this;
    }

    then<TResult1 = { readonly error: FakeDatabaseError | null }, TResult2 = never>(
        onfulfilled?: ((value: { readonly error: FakeDatabaseError | null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        if (!this.state.missingTable) {
            this.state.deletes.push([...this.filters]);
        }
        const value = {
            error: this.state.missingTable ? createMissingTableError() : null
        };
        return Promise.resolve(value).then(onfulfilled, onrejected);
    }
}

class FakePresetTable {
    constructor(private readonly state: FakePresetState) {}

    select(): FakeSelectQuery {
        return new FakeSelectQuery(this.state);
    }

    upsert(payload: JsonRecord): FakeUpsertQuery {
        return new FakeUpsertQuery(this.state, payload);
    }

    delete(): FakeDeleteQuery {
        return new FakeDeleteQuery(this.state);
    }
}

function createState(overrides: Partial<FakePresetState> = {}): FakePresetState {
    return {
        deletes: [],
        rows: [],
        upserts: [],
        ...overrides
    };
}

function createDependencies(state: FakePresetState, resolvedRequester: RequesterProfile | null = requester) {
    const fakeSupabase = {
        from(table: string): FakePresetTable {
            assert.equal(table, 'franchise_location_meeting_tool_presets');
            return new FakePresetTable(state);
        }
    };
    return {
        getSupabaseAdmin: () => fakeSupabase as never,
        resolveRequester: async () => resolvedRequester
    };
}

async function readPayload(response: Response): Promise<JsonRecord> {
    const payload: unknown = await response.json();
    return isJsonRecord(payload) ? payload : {};
}

function createPostRequest(body: JsonRecord): Request {
    return new Request('http://localhost/api/franchise-locations/meeting-tool-presets', {
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
    });
}

test('Given no authenticated requester When loading presets Then the route rejects legacy access', async () => {
    const state = createState();
    const response = await handleMeetingToolPresetsGET(
        new Request(`http://localhost/api/franchise-locations/meeting-tool-presets?companyId=${companyId}&requesterId=${managerId}`),
        createDependencies(state, null)
    );
    const payload = await readPayload(response);

    assert.equal(response.status, 401);
    assert.equal(payload.code, 'AUTH_REQUIRED');
});

test('Given a malformed preset body When saving Then existing preset data is not overwritten', async () => {
    const state = createState();
    const response = await handleMeetingToolPresetsPOST(createPostRequest({
        companyId,
        meetingTool: null,
        name: '기본 수익비율'
    }), createDependencies(state));
    const payload = await readPayload(response);

    assert.equal(response.status, 400);
    assert.equal(payload.code, 'VALIDATION_ERROR');
    assert.equal(state.upserts.length, 0);
});

test('Given a valid preset body When saving Then only reusable meeting tool data is upserted', async () => {
    const state = createState();
    const response = await handleMeetingToolPresetsPOST(createPostRequest({
        companyId,
        meetingTool: {
            activeTargetKey: 'first',
            costRows: [
                { key: 'materialCost', amount: '1,575', memo: '표준' }
            ],
            marketReport: {
                targetSalesBasis: '프리셋에 저장되면 안 되는 목표매출 근거',
                tradeAreaSummary: '후보지 전용 상권 요약'
            },
            reportMemo: '후보지별 보고 메모',
            targetSales: '4,500'
        },
        name: '기본 수익비율'
    }), createDependencies(state));
    const payload = await readPayload(response);

    assert.equal(response.status, 200);
    assert.equal(state.upserts.length, 1);
    const upsert = state.upserts[0];
    assert.ok(upsert);
    assert.equal(upsert.company_id, companyId);
    assert.equal(upsert.name, '기본 수익비율');
    assert.equal(upsert.created_by, managerId);
    assert.ok(isJsonRecord(upsert.data));
    assert.deepEqual(Object.keys(upsert.data).sort(), [
        'activeTargetKey',
        'costRows',
        'targetSales',
        'targetScenarios'
    ]);
    assert.equal(upsert.data.marketReport, undefined);
    assert.equal(upsert.data.reportMemo, undefined);
    assert.ok(isJsonRecord(payload.data));
    assert.ok(isJsonRecord(payload.data.preset));
    assert.equal(payload.data.preset.name, '기본 수익비율');
});

test('Given the preset table is missing When loading presets Then SQL setup is reported', async () => {
    const state = createState({ missingTable: true });
    const response = await handleMeetingToolPresetsGET(
        new Request(`http://localhost/api/franchise-locations/meeting-tool-presets?companyId=${companyId}`),
        createDependencies(state)
    );
    const payload = await readPayload(response);

    assert.equal(response.status, 424);
    assert.equal(payload.code, 'VALIDATION_ERROR');
});

test('Given another company preset id When deleting Then existence is hidden and no delete runs', async () => {
    const state = createState({
        rows: [{
            company_id: otherCompanyId,
            created_at: '2026-06-30T00:00:00.000Z',
            data: {},
            id: presetId,
            name: '타 회사 프리셋',
            updated_at: '2026-06-30T00:00:00.000Z'
        }]
    });
    const response = await handleMeetingToolPresetsDELETE(
        new Request(`http://localhost/api/franchise-locations/meeting-tool-presets?presetId=${presetId}`, { method: 'DELETE' }),
        createDependencies(state)
    );
    const payload = await readPayload(response);

    assert.equal(response.status, 404);
    assert.equal(payload.code, 'NOT_FOUND');
    assert.equal(state.deletes.length, 0);
});

test('Given malformed ids When routes receive them Then validation fails before Supabase filters', async () => {
    const state = createState();
    const getResponse = await handleMeetingToolPresetsGET(
        new Request('http://localhost/api/franchise-locations/meeting-tool-presets?companyId=not-a-uuid'),
        createDependencies(state)
    );
    const deleteResponse = await handleMeetingToolPresetsDELETE(
        new Request('http://localhost/api/franchise-locations/meeting-tool-presets?presetId=not-a-uuid', { method: 'DELETE' }),
        createDependencies(state)
    );

    assert.equal(getResponse.status, 400);
    assert.equal(deleteResponse.status, 400);
    assert.equal(state.deletes.length, 0);
});
