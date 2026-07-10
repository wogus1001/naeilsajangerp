import { randomUUID } from 'crypto';
import {
    dateKeyFromFranchiseScheduleValue,
    normalizeFranchiseScheduleStatus,
    validateFranchiseScheduleInput,
    type FranchiseScheduleSourceType,
    type FranchiseScheduleStatus
} from './franchise-schedules';

export type JsonRecord = Record<string, unknown>;

export type FranchiseScheduleRow = {
    readonly id: string; readonly company_id: string; readonly title: string; readonly date: string;
    readonly creator_profile_id: string | null; readonly assignee_profile_id: string | null; readonly manager_profile_id: string | null;
    readonly status: FranchiseScheduleStatus; readonly type: string; readonly color: string; readonly details: string;
    readonly source_type: FranchiseScheduleSourceType | null; readonly source_id: string | null;
    readonly due_at: string | null; readonly remind_at: string | null; readonly completed_at: string | null;
    readonly metadata: unknown; readonly created_at: string; readonly updated_at: string;
};

type FranchiseSchedulePayload = Omit<FranchiseScheduleRow, 'id' | 'created_at'>;
export type FranchiseScheduleInsertRow = FranchiseSchedulePayload & {
    readonly id: string;
    readonly created_at: string;
};
type FranchiseScheduleMutablePatch = {
    -readonly [Key in keyof FranchiseSchedulePayload]?: FranchiseSchedulePayload[Key];
};

export type FranchiseScheduleCreateInput = {
    readonly companyId: string; readonly creatorProfileId: string; readonly title: string;
    readonly date?: string | null; readonly dueAt?: string | null; readonly status?: string | null;
    readonly type?: string | null; readonly color?: string | null; readonly details?: string | null;
    readonly assigneeProfileId?: string | null; readonly managerProfileId?: string | null; readonly remindAt?: string | null;
    readonly metadata?: JsonRecord;
};

export type FranchiseScheduleUpdateInput = Partial<Omit<FranchiseScheduleCreateInput, 'companyId' | 'creatorProfileId'>> & {
    readonly companyId: string;
    readonly scheduleId: string;
};

export type FranchiseScheduleSourceInput = FranchiseScheduleCreateInput & {
    readonly scheduleId?: string | null;
    readonly sourceType: FranchiseScheduleSourceType;
    readonly sourceId: string;
};

export type FranchiseScheduleCompleteInput = {
    readonly companyId: string; readonly completedAt?: string | null; readonly scheduleId?: string | null;
    readonly sourceType?: FranchiseScheduleSourceType | null; readonly sourceId?: string | null;
};

export type StoreDbError = {
    readonly code?: string; readonly message?: string;
};

type StoreResult<T> = Promise<{ readonly data: T | null; readonly error: StoreDbError | null }>;

export interface FranchiseScheduleQuery {
    insert(row: FranchiseScheduleInsertRow): FranchiseScheduleQuery;
    update(row: Partial<FranchiseSchedulePayload>): FranchiseScheduleQuery;
    delete(): FranchiseScheduleQuery;
    select(columns: string): FranchiseScheduleQuery;
    eq(column: string, value: string): FranchiseScheduleQuery;
    is(column: string, value: null): FranchiseScheduleQuery;
    maybeSingle(): StoreResult<FranchiseScheduleRow>;
    single(): StoreResult<FranchiseScheduleRow>;
}

export interface FranchiseScheduleDatabase {
    from(table: 'franchise_schedules'): FranchiseScheduleQuery;
}

export class FranchiseScheduleStoreError extends Error {
    readonly name = 'FranchiseScheduleStoreError';

    constructor(readonly code: 'FRANCHISE_SCHEDULE_VALIDATION' | 'FRANCHISE_SCHEDULE_SOURCE_MISMATCH' | 'FRANCHISE_SCHEDULE_DB_ERROR') {
        super(code);
    }
}

function nowIso(): string {
    return new Date().toISOString();
}

function dbError(error: StoreDbError | null): FranchiseScheduleStoreError {
    return new FranchiseScheduleStoreError(error?.message === 'FRANCHISE_SCHEDULE_SOURCE_MISMATCH'
        ? 'FRANCHISE_SCHEDULE_SOURCE_MISMATCH'
        : 'FRANCHISE_SCHEDULE_DB_ERROR');
}

function isUniqueSourceConflict(error: StoreDbError | null): boolean {
    return error?.code === '23505' && (error.message ?? '').includes('idx_franchise_schedules_source_unique');
}

function buildPayload(input: FranchiseScheduleCreateInput & {
    readonly sourceType?: string | null;
    readonly sourceId?: string | null;
}, createdAt: string): FranchiseSchedulePayload {
    const validation = validateFranchiseScheduleInput(input);
    if (!validation.ok) throw new FranchiseScheduleStoreError('FRANCHISE_SCHEDULE_VALIDATION');
    return {
        company_id: input.companyId,
        creator_profile_id: input.creatorProfileId,
        assignee_profile_id: input.assigneeProfileId ?? input.creatorProfileId,
        manager_profile_id: input.managerProfileId ?? null,
        title: validation.value.title,
        date: validation.value.date,
        status: validation.value.status,
        type: input.type ?? 'manual',
        color: input.color ?? '#3182f6',
        details: input.details ?? '',
        source_type: validation.value.source?.sourceType ?? null,
        source_id: validation.value.source?.sourceId ?? null,
        due_at: input.dueAt ?? null,
        remind_at: input.remindAt ?? null,
        completed_at: validation.value.status === '완료' ? createdAt : null,
        metadata: input.metadata ?? {},
        updated_at: createdAt
    };
}

function buildSourcePayload(input: FranchiseScheduleSourceInput, createdAt: string): FranchiseSchedulePayload {
    return {
        ...buildPayload(input, createdAt),
        source_type: input.sourceType,
        source_id: input.sourceId,
        type: input.type ?? 'workflow'
    };
}

async function findSourceId(db: FranchiseScheduleDatabase, input: FranchiseScheduleSourceInput): Promise<string | null> {
    const { data, error } = await db.from('franchise_schedules')
        .select('id')
        .eq('company_id', input.companyId)
        .eq('source_type', input.sourceType)
        .eq('source_id', input.sourceId)
        .maybeSingle();
    if (error) throw dbError(error);
    return data?.id ?? null;
}

async function ensureSourceMatch(db: FranchiseScheduleDatabase, input: FranchiseScheduleSourceInput): Promise<void> {
    if (!input.scheduleId) return;
    const { data, error } = await db.from('franchise_schedules')
        .select('source_type, source_id')
        .eq('company_id', input.companyId)
        .eq('id', input.scheduleId)
        .maybeSingle();
    if (error) throw dbError(error);
    if (data && data.source_type && (data.source_type !== input.sourceType || data.source_id !== input.sourceId)) {
        throw new FranchiseScheduleStoreError('FRANCHISE_SCHEDULE_SOURCE_MISMATCH');
    }
}

export async function createManualFranchiseSchedule(
    db: FranchiseScheduleDatabase,
    input: FranchiseScheduleCreateInput
): Promise<FranchiseScheduleRow> {
    const createdAt = nowIso();
    const payload = buildPayload(input, createdAt);
    const { data, error } = await db.from('franchise_schedules')
        .insert({ id: randomUUID(), created_at: createdAt, ...payload })
        .select('*')
        .single();
    if (error || !data) throw dbError(error);
    return data;
}

export async function updateManualFranchiseSchedule(
    db: FranchiseScheduleDatabase,
    input: FranchiseScheduleUpdateInput
): Promise<FranchiseScheduleRow> {
    const current = await db.from('franchise_schedules')
        .select('source_type, source_id')
        .eq('company_id', input.companyId)
        .eq('id', input.scheduleId)
        .single();
    if (current.error || !current.data) throw dbError(current.error);
    if (current.data.source_type || current.data.source_id) throw new FranchiseScheduleStoreError('FRANCHISE_SCHEDULE_SOURCE_MISMATCH');
    const updatedAt = nowIso();
    const status = input.status ? normalizeFranchiseScheduleStatus(input.status) : null;
    if (input.status && !status) throw new FranchiseScheduleStoreError('FRANCHISE_SCHEDULE_VALIDATION');
    const date = dateKeyFromFranchiseScheduleValue(input.date) ?? dateKeyFromFranchiseScheduleValue(input.dueAt);
    const patch: FranchiseScheduleMutablePatch = { updated_at: updatedAt };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.date !== undefined || input.dueAt !== undefined) {
        if (!date) throw new FranchiseScheduleStoreError('FRANCHISE_SCHEDULE_VALIDATION');
        patch.date = date;
    }
    if (status) patch.status = status;
    if (input.details !== undefined) patch.details = input.details ?? '';
    const { data, error } = await db.from('franchise_schedules')
        .update(patch)
        .eq('company_id', input.companyId)
        .eq('id', input.scheduleId)
        .is('source_type', null)
        .select('*')
        .single();
    if (error || !data) throw dbError(error);
    return data;
}

export async function deleteManualFranchiseSchedule(db: FranchiseScheduleDatabase, companyId: string, scheduleId: string): Promise<void> {
    const { error } = await db.from('franchise_schedules')
        .delete()
        .eq('company_id', companyId)
        .eq('id', scheduleId)
        .is('source_type', null)
        .single();
    if (error) throw dbError(error);
}

export async function upsertSourceFranchiseSchedule(
    db: FranchiseScheduleDatabase,
    input: FranchiseScheduleSourceInput
): Promise<FranchiseScheduleRow> {
    await ensureSourceMatch(db, input);
    const updatedAt = nowIso();
    const payload = buildSourcePayload(input, updatedAt);
    const existingId = await findSourceId(db, input);
    if (existingId) return updateSourceById(db, input.companyId, existingId, payload);
    const { data, error } = await db.from('franchise_schedules')
        .insert({ id: input.scheduleId ?? randomUUID(), created_at: updatedAt, ...payload })
        .select('*')
        .single();
    if (error && isUniqueSourceConflict(error)) {
        const conflictId = await findSourceId(db, input);
        if (conflictId) return updateSourceById(db, input.companyId, conflictId, payload);
    }
    if (error || !data) throw dbError(error);
    return data;
}

async function updateSourceById(
    db: FranchiseScheduleDatabase,
    companyId: string,
    scheduleId: string,
    payload: FranchiseSchedulePayload
): Promise<FranchiseScheduleRow> {
    const { data, error } = await db.from('franchise_schedules')
        .update(payload)
        .eq('company_id', companyId)
        .eq('id', scheduleId)
        .select('*')
        .single();
    if (error || !data) throw dbError(error);
    return data;
}

export async function completeFranchiseSchedule(db: FranchiseScheduleDatabase, input: FranchiseScheduleCompleteInput): Promise<void> {
    const completedAt = input.completedAt ?? nowIso();
    const query = db.from('franchise_schedules')
        .update({ status: '완료', completed_at: completedAt, updated_at: completedAt })
        .eq('company_id', input.companyId);
    if (input.scheduleId) {
        const { error } = await query.eq('id', input.scheduleId).single();
        if (error) throw dbError(error);
        return;
    }
    if (!input.sourceType || !input.sourceId) throw new FranchiseScheduleStoreError('FRANCHISE_SCHEDULE_VALIDATION');
    const { error } = await query.eq('source_type', input.sourceType).eq('source_id', input.sourceId).single();
    if (error) throw dbError(error);
}
