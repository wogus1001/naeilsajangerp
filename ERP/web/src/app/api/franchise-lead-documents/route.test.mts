import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from '@/lib/api-auth';
import {
    handleLeadDocumentsGET,
    handleLeadDocumentsPOST
} from './route.js';

type JsonRecord = Record<string, unknown>;
type QueryFilter = {
    readonly column: string;
    readonly operator: 'eq' | 'neq';
    readonly value: unknown;
};

type FakeSupabaseState = {
    readonly contracts: Record<string, JsonRecord>;
    readonly documents: Record<string, JsonRecord>;
    readonly leads: Record<string, JsonRecord>;
    readonly links: JsonRecord[];
    readonly signedUrlRequests: Array<{ readonly bucket: string; readonly path: string; readonly expiresIn: number }>;
    readonly upserts: Array<{ readonly table: string; readonly payload: JsonRecord }>;
};

const requester: RequesterProfile = {
    company_id: 'company-1',
    id: 'manager-1',
    role: 'manager'
};

function createState(overrides: Partial<FakeSupabaseState> = {}): FakeSupabaseState {
    return {
        contracts: {},
        documents: {},
        leads: {
            'lead-1': {
                company_id: 'company-1',
                created_by: 'manager-1',
                id: 'lead-1',
                manager_id: 'manager-1'
            }
        },
        links: [],
        signedUrlRequests: [],
        upserts: [],
        ...overrides
    };
}

function matchesFilters(row: JsonRecord, filters: readonly QueryFilter[]): boolean {
    return filters.every(filter => {
        const rowValue = row[filter.column];
        return filter.operator === 'eq'
            ? rowValue === filter.value
            : rowValue !== filter.value;
    });
}

function rowsForTable(state: FakeSupabaseState, table: string): readonly JsonRecord[] {
    switch (table) {
        case 'electronic_contracts':
            return Object.values(state.contracts);
        case 'franchise_lead_document_checklist_links':
            return state.links;
        case 'franchise_lead_documents':
            return Object.values(state.documents);
        case 'franchise_leads':
            return Object.values(state.leads);
        default:
            return [];
    }
}

function selectRows(state: FakeSupabaseState, table: string, filters: readonly QueryFilter[]): readonly JsonRecord[] {
    return rowsForTable(state, table).filter(row => matchesFilters(row, filters));
}

class FakeMutationQuery {
    private readonly filters: QueryFilter[] = [];

    constructor(
        private readonly state: FakeSupabaseState,
        private readonly table: string,
        private readonly operation: 'delete' | 'update' | 'upsert',
        private readonly payload: JsonRecord = {}
    ) {}

    eq(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'eq', value });
        return this;
    }

    select(): { readonly single: () => Promise<{ readonly data: JsonRecord; readonly error: null }> } {
        return {
            single: async () => {
                const data = this.applyMutation();
                return { data, error: null };
            }
        };
    }

    then<TResult1 = { readonly error: null }, TResult2 = never>(
        onfulfilled?: ((value: { readonly error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        this.applyMutation();
        return Promise.resolve({ error: null }).then(onfulfilled, onrejected);
    }

    private applyMutation(): JsonRecord {
        this.state.upserts.push({ table: this.table, payload: this.payload });
        if (this.operation === 'upsert' && this.table === 'franchise_lead_documents') {
            const id = String(this.payload.id || 'doc-created');
            const nextDocument = { ...this.payload, id };
            this.state.documents[id] = nextDocument;
            return nextDocument;
        }
        if (this.operation === 'upsert' && this.table === 'franchise_lead_document_checklist_links') {
            this.state.links.push(this.payload);
            return this.payload;
        }
        if (this.operation === 'delete' && this.table === 'franchise_lead_documents') {
            Object.entries(this.state.documents)
                .filter(([, row]) => matchesFilters(row, this.filters))
                .forEach(([id]) => {
                    delete this.state.documents[id];
                });
        }
        return this.payload;
    }
}

class FakeSelectQuery {
    private readonly filters: QueryFilter[] = [];

    constructor(
        private readonly state: FakeSupabaseState,
        private readonly table: string
    ) {}

    eq(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'eq', value });
        return this;
    }

    neq(column: string, value: unknown): this {
        this.filters.push({ column, operator: 'neq', value });
        return this;
    }

    order(): this {
        return this;
    }

    async maybeSingle(): Promise<{ readonly data: JsonRecord | null; readonly error: null }> {
        return { data: selectRows(this.state, this.table, this.filters)[0] || null, error: null };
    }

    async single(): Promise<{ readonly data: JsonRecord | null; readonly error: null }> {
        return { data: selectRows(this.state, this.table, this.filters)[0] || null, error: null };
    }

    then<TResult1 = { readonly data: readonly JsonRecord[]; readonly error: null }, TResult2 = never>(
        onfulfilled?: ((value: { readonly data: readonly JsonRecord[]; readonly error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return Promise.resolve({
            data: selectRows(this.state, this.table, this.filters),
            error: null
        }).then(onfulfilled, onrejected);
    }
}

class FakeTable {
    constructor(
        private readonly state: FakeSupabaseState,
        private readonly table: string
    ) {}

    delete(): FakeMutationQuery {
        return new FakeMutationQuery(this.state, this.table, 'delete');
    }

    select(): FakeSelectQuery {
        return new FakeSelectQuery(this.state, this.table);
    }

    update(payload: JsonRecord): FakeMutationQuery {
        return new FakeMutationQuery(this.state, this.table, 'update', payload);
    }

    upsert(payload: JsonRecord): FakeMutationQuery {
        return new FakeMutationQuery(this.state, this.table, 'upsert', payload);
    }
}

function createFakeSupabase(state: FakeSupabaseState) {
    return {
        from(table: string): FakeTable {
            return new FakeTable(state, table);
        },
        storage: {
            from(bucket: string) {
                return {
                    createSignedUrl: async (path: string, expiresIn: number) => {
                        state.signedUrlRequests.push({ bucket, expiresIn, path });
                        return {
                            data: { signedUrl: `https://signed.test/${encodeURIComponent(path)}` },
                            error: null
                        };
                    },
                    remove: async () => ({ error: null })
                };
            }
        }
    };
}

function createDependencies(state: FakeSupabaseState, resolvedRequester: RequesterProfile | null = requester) {
    const supabase = createFakeSupabase(state);
    return {
        getSupabaseAdmin: () => supabase as never,
        resolveRequester: async () => resolvedRequester
    };
}

function readPayload(response: Response): Promise<JsonRecord> {
    return response.json() as Promise<JsonRecord>;
}

function postRequest(body: JsonRecord): Request {
    return new Request('http://localhost/api/franchise-lead-documents', {
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
    });
}

test('Given requesterId query without bearer session When listing lead documents Then it is rejected', async () => {
    const state = createState();
    const response = await handleLeadDocumentsGET(
        new Request('http://localhost/api/franchise-lead-documents?leadId=lead-1&requesterId=manager-1'),
        createDependencies(state, null)
    );
    const payload = await readPayload(response);

    assert.equal(response.status, 401);
    assert.equal(payload.code, 'AUTH_REQUIRED');
});

test('Given upload document registration When fileUrl is supplied Then scoped storage is required and public URL is suppressed', async () => {
    const state = createState();
    const missingStorageResponse = await handleLeadDocumentsPOST(postRequest({
        fileUrl: 'https://public.test/file.pdf',
        leadId: 'lead-1',
        sourceType: 'upload',
        title: '신분증'
    }), createDependencies(state));
    const missingStoragePayload = await readPayload(missingStorageResponse);

    assert.equal(missingStorageResponse.status, 400);
    assert.equal(missingStoragePayload.code, 'VALIDATION_ERROR');

    const response = await handleLeadDocumentsPOST(postRequest({
        fileUrl: 'https://public.test/file.pdf',
        leadId: 'lead-1',
        sourceType: 'upload',
        storageBucket: 'property-documents',
        storagePath: 'franchise-lead-documents/company-1/lead-1/id.pdf',
        title: '신분증'
    }), createDependencies(state));
    const documentUpsert = state.upserts.find(entry => entry.table === 'franchise_lead_documents');

    assert.equal(response.status, 201);
    assert.equal(documentUpsert?.payload.file_url, '');
    assert.deepEqual(documentUpsert?.payload.data, {
        storageBucket: 'property-documents',
        storagePath: 'franchise-lead-documents/company-1/lead-1/id.pdf'
    });
});

test('Given electronic contract from another lead When linking document Then it is rejected', async () => {
    const state = createState({
        contracts: {
            'contract-other': {
                company_id: 'company-1',
                id: 'contract-other',
                lead_id: 'lead-2'
            }
        }
    });
    const response = await handleLeadDocumentsPOST(postRequest({
        leadId: 'lead-1',
        sourceId: 'contract-other',
        sourceType: 'electronic_contract',
        title: '전자계약'
    }), createDependencies(state));
    const payload = await readPayload(response);

    assert.equal(response.status, 403);
    assert.equal(payload.code, 'FORBIDDEN');
    assert.equal(state.upserts.find(entry => entry.table === 'franchise_lead_documents'), undefined);
});

test('Given uploaded lead document When opening document Then signed URL is minted for scoped storage path', async () => {
    const state = createState({
        documents: {
            'doc-1': {
                company_id: 'company-1',
                data: {
                    storageBucket: 'property-documents',
                    storagePath: 'franchise-lead-documents/company-1/lead-1/id.pdf'
                },
                id: 'doc-1',
                lead_id: 'lead-1',
                source_type: 'upload',
                status: 'active',
                title: '신분증'
            }
        }
    });
    const response = await handleLeadDocumentsGET(
        new Request('http://localhost/api/franchise-lead-documents?action=open&documentId=doc-1'),
        createDependencies(state)
    );
    const payload = await readPayload(response);

    assert.equal(response.status, 200);
    assert.deepEqual(state.signedUrlRequests, [{
        bucket: 'property-documents',
        expiresIn: 300,
        path: 'franchise-lead-documents/company-1/lead-1/id.pdf'
    }]);
    assert.equal((payload.data as JsonRecord).expiresIn, 300);
    assert.match(String((payload.data as JsonRecord).url), /^https:\/\/signed\.test\//);
});
