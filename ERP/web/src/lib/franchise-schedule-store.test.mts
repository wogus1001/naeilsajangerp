import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import type * as FranchiseScheduleStore from './franchise-schedule-store.js';
import type {
    FranchiseScheduleDatabase,
    FranchiseScheduleInsertRow,
    FranchiseScheduleQuery,
    FranchiseScheduleRow,
    StoreDbError
} from './franchise-schedule-store.js';

const loadFranchiseScheduleStore: (path: string) => typeof FranchiseScheduleStore = createRequire(import.meta.url);
const franchiseScheduleStoreSourcePath = './franchise-schedule-store.t' + 's';
const {
    completeFranchiseSchedule,
    createManualFranchiseSchedule,
    deleteManualFranchiseSchedule,
    FranchiseScheduleStoreError,
    updateManualFranchiseSchedule,
    upsertSourceFranchiseSchedule
} = loadFranchiseScheduleStore(franchiseScheduleStoreSourcePath);

type Filter = {
    readonly column: string;
    readonly value: string | null;
};

type Mutation =
    | { readonly kind: 'insert'; readonly row: FranchiseScheduleInsertRow }
    | { readonly kind: 'update'; readonly row: Partial<FranchiseScheduleRow> }
    | { readonly kind: 'delete' }
    | { readonly kind: 'select' };

class MemoryDb implements FranchiseScheduleDatabase {
    rows: readonly FranchiseScheduleRow[] = [];
    readonly tables: string[] = [];
    readonly filters: Filter[] = [];

    from(table: 'franchise_schedules'): FranchiseScheduleQuery {
        this.tables.push(table);
        return new MemoryQuery(this);
    }
}

class MemoryQuery implements FranchiseScheduleQuery {
    private mutation: Mutation = { kind: 'select' };
    private readonly filters: Filter[] = [];

    constructor(private readonly db: MemoryDb) {}

    insert(row: FranchiseScheduleInsertRow): FranchiseScheduleQuery {
        this.mutation = { kind: 'insert', row };
        return this;
    }

    update(row: Partial<FranchiseScheduleRow>): FranchiseScheduleQuery {
        this.mutation = { kind: 'update', row };
        return this;
    }

    delete(): FranchiseScheduleQuery {
        this.mutation = { kind: 'delete' };
        return this;
    }

    select(_columns: string): FranchiseScheduleQuery {
        return this;
    }

    eq(column: string, value: string): FranchiseScheduleQuery {
        this.filters.push({ column, value });
        this.db.filters.push({ column, value });
        return this;
    }

    is(column: string, value: null): FranchiseScheduleQuery {
        this.filters.push({ column, value });
        this.db.filters.push({ column, value });
        return this;
    }

    async maybeSingle(): Promise<{ readonly data: FranchiseScheduleRow | null; readonly error: StoreDbError | null }> {
        return this.execute(false);
    }

    async single(): Promise<{ readonly data: FranchiseScheduleRow | null; readonly error: StoreDbError | null }> {
        return this.execute(true);
    }

    private execute(requireRow: boolean): { readonly data: FranchiseScheduleRow | null; readonly error: StoreDbError | null } {
        switch (this.mutation.kind) {
            case 'insert':
                return this.insertRow(this.mutation.row);
            case 'update':
                return this.updateRow(this.mutation.row, requireRow);
            case 'delete':
                return this.deleteRow(requireRow);
            case 'select':
                return this.selectRow(requireRow);
            default:
                return assertNever(this.mutation);
        }
    }

    private insertRow(row: FranchiseScheduleInsertRow): { readonly data: FranchiseScheduleRow | null; readonly error: StoreDbError | null } {
        const conflicts = row.source_type && row.source_id && this.db.rows.some(existing =>
            existing.company_id === row.company_id &&
            existing.source_type === row.source_type &&
            existing.source_id === row.source_id
        );
        if (conflicts) {
            return { data: null, error: { code: '23505', message: 'idx_franchise_schedules_source_unique' } };
        }
        this.db.rows = [...this.db.rows, row];
        return { data: row, error: null };
    }

    private updateRow(
        patch: Partial<FranchiseScheduleRow>,
        requireRow: boolean
    ): { readonly data: FranchiseScheduleRow | null; readonly error: StoreDbError | null } {
        const current = this.matchingRows()[0] ?? null;
        if (!current) return missingResult(requireRow);
        const updated = { ...current, ...patch };
        this.db.rows = this.db.rows.map(row => row.id === current.id ? updated : row);
        return { data: updated, error: null };
    }

    private deleteRow(requireRow: boolean): { readonly data: FranchiseScheduleRow | null; readonly error: StoreDbError | null } {
        const current = this.matchingRows()[0] ?? null;
        if (!current) return missingResult(requireRow);
        this.db.rows = this.db.rows.filter(row => row.id !== current.id);
        return { data: current, error: null };
    }

    private selectRow(requireRow: boolean): { readonly data: FranchiseScheduleRow | null; readonly error: StoreDbError | null } {
        return { data: this.matchingRows()[0] ?? null, error: this.matchingRows().length === 0 && requireRow ? { message: 'not found' } : null };
    }

    private matchingRows(): readonly FranchiseScheduleRow[] {
        return this.db.rows.filter(row => this.filters.every(filter => rowValue(row, filter.column) === filter.value));
    }
}

function rowValue(row: FranchiseScheduleRow, column: string): string | null {
    switch (column) {
        case 'id':
            return row.id;
        case 'company_id':
            return row.company_id;
        case 'source_type':
            return row.source_type;
        case 'source_id':
            return row.source_id;
        default:
            return null;
    }
}

function missingResult(requireRow: boolean): { readonly data: null; readonly error: StoreDbError | null } {
    return { data: null, error: requireRow ? { message: 'not found' } : null };
}

function assertNever(value: never): never {
    throw new Error(`Unexpected mutation ${JSON.stringify(value)}`);
}

function seedSourceRow(): FranchiseScheduleRow {
    const now = '2026-07-10T00:00:00.000Z';
    return {
        id: 'source-row',
        company_id: 'company-1',
        creator_profile_id: 'creator-1',
        assignee_profile_id: 'staff-1',
        manager_profile_id: null,
        title: '기존 결재',
        date: '2026-07-10',
        status: '예정',
        type: 'workflow',
        color: '#3182f6',
        details: '',
        source_type: 'approval-document',
        source_id: 'doc-1',
        due_at: null,
        remind_at: null,
        completed_at: null,
        metadata: {},
        created_at: now,
        updated_at: now
    };
}

void test('Given manual input When creating Then only franchise_schedules is targeted', async () => {
    const db = new MemoryDb();

    const row = await createManualFranchiseSchedule(db, {
        companyId: 'company-1',
        creatorProfileId: 'creator-1',
        title: ' 수동 일정 ',
        date: '2026-07-10'
    });

    assert.equal(row.title, '수동 일정');
    assert.equal(row.source_type, null);
    assert.deepEqual([...new Set(db.tables)], ['franchise_schedules']);
});

void test('Given existing source row When upserting same source Then one row is preserved and status is Korean', async () => {
    const db = new MemoryDb();
    db.rows = [seedSourceRow()];

    const row = await upsertSourceFranchiseSchedule(db, {
        companyId: 'company-1',
        creatorProfileId: 'creator-1',
        title: '결재 갱신',
        date: '2026-07-11',
        status: 'scheduled',
        sourceType: 'approval-document',
        sourceId: 'doc-1'
    });

    assert.equal(db.rows.length, 1);
    assert.equal(row.id, 'source-row');
    assert.equal(row.status, '예정');
    assert.equal(row.title, '결재 갱신');
});

void test('Given unsupported source status When upserting Then validation error is thrown before insert', async () => {
    const db = new MemoryDb();

    await assert.rejects(
        upsertSourceFranchiseSchedule(db, {
            companyId: 'company-1',
            creatorProfileId: 'creator-1',
            title: '결재',
            date: '2026-07-11',
            status: 'legacy-open',
            sourceType: 'approval-document',
            sourceId: 'doc-1'
        }),
        (error: unknown) => error instanceof FranchiseScheduleStoreError && error.code === 'FRANCHISE_SCHEDULE_VALIDATION'
    );
});

void test('Given same id with different source When upserting Then mismatch is blocked', async () => {
    const db = new MemoryDb();
    db.rows = [seedSourceRow()];

    await assert.rejects(
        upsertSourceFranchiseSchedule(db, {
            scheduleId: 'source-row',
            companyId: 'company-1',
            creatorProfileId: 'creator-1',
            title: '다른 원천',
            date: '2026-07-11',
            sourceType: 'supervision-visit',
            sourceId: 'visit-1'
        }),
        (error: unknown) => error instanceof FranchiseScheduleStoreError && error.code === 'FRANCHISE_SCHEDULE_SOURCE_MISMATCH'
    );
});

void test('Given source and manual rows When completing and deleting Then filters protect source rows', async () => {
    const db = new MemoryDb();
    const manual = await createManualFranchiseSchedule(db, {
        companyId: 'company-1',
        creatorProfileId: 'creator-1',
        title: '수동',
        date: '2026-07-10'
    });
    db.rows = [...db.rows, seedSourceRow()];

    await completeFranchiseSchedule(db, { companyId: 'company-1', sourceType: 'approval-document', sourceId: 'doc-1', completedAt: '2026-07-10T01:00:00.000Z' });
    await updateManualFranchiseSchedule(db, { companyId: 'company-1', scheduleId: manual.id, title: '수동 수정' });
    await deleteManualFranchiseSchedule(db, 'company-1', manual.id);

    assert.equal(db.rows.length, 1);
    assert.equal(db.rows[0]?.status, '완료');
    assert.equal(db.filters.some(filter => filter.column === 'source_type' && filter.value === null), true);
});
