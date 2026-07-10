import { randomUUID } from 'node:crypto';
import {
    getAuthenticatedRequesterProfile,
    type RequesterProfile
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getSupabaseAdmin as createSupabaseAdminClient } from '@/lib/supabase-admin';

export type JsonRecord = Record<string, unknown>;
export type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type FranchiseScheduleRouteDependencies = {
    readonly getSupabaseAdmin: () => SupabaseAdminClient;
    readonly resolveRequester: (
        supabaseAdmin: SupabaseAdminClient,
        request: Request
    ) => Promise<RequesterProfile | ActiveRequesterProfile | null>;
};

export type ActiveRequesterProfile = RequesterProfile & { readonly status: string | null };

type ProfileRow = ActiveRequesterProfile;

export type ScheduleRow = {
    readonly id: string; readonly company_id: string | null; readonly creator_profile_id: string | null;
    readonly assignee_profile_id: string | null; readonly manager_profile_id: string | null;
    readonly title: string | null; readonly date: string | null; readonly status: string | null;
    readonly type: string | null; readonly color: string | null; readonly details: string | null;
    readonly source_type: string | null; readonly source_id: string | null;
    readonly due_at: string | null; readonly remind_at: string | null; readonly completed_at: string | null;
    readonly metadata: JsonRecord | null; readonly created_at: string | null; readonly updated_at: string | null;
};

const PREPARE_SQL = 'supabase_franchise_schedule_prepare_migration.sql';
const MISSING_SCHEMA_CODES = ['PGRST204', 'PGRST205', '42P01', '42703'] as const;

export function createDefaultRouteDependencies(): FranchiseScheduleRouteDependencies {
    return {
        getSupabaseAdmin: createSupabaseAdminClient,
        resolveRequester: getAuthenticatedRequesterProfile
    };
}

export function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function hasOwn(record: JsonRecord, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(record, key);
}

export function valueFor(record: JsonRecord, camelKey: string, snakeKey: string): unknown {
    return hasOwn(record, camelKey) ? record[camelKey] : record[snakeKey];
}

export function isManagerRole(role: string | null): boolean {
    return role === 'admin' || role === 'manager';
}

export function isManualSchedule(row: Pick<ScheduleRow, 'source_id' | 'source_type'>): boolean {
    return !row.source_type && !row.source_id;
}

function isMissingFranchiseScheduleSchemaError(error: unknown): boolean {
    const code = isRecord(error) && typeof error.code === 'string' ? error.code : '';
    const message = error instanceof Error
        ? error.message
        : isRecord(error) && typeof error.message === 'string'
            ? error.message
            : '';
    return MISSING_SCHEMA_CODES.some(schemaCode => schemaCode === code)
        && /franchise_schedules|creator_profile_id|assignee_profile_id|manager_profile_id/i.test(message);
}

export function handleFranchiseScheduleError(error: unknown, action: string): Response {
    console.error(`Franchise schedules ${action} error:`, error);
    if (isMissingFranchiseScheduleSchemaError(error)) {
        return fail(424, 'VALIDATION_ERROR', `프랜차이즈 일정 SQL 등록 필요: ${PREPARE_SQL}`);
    }
    return fail(500, 'INTERNAL_ERROR', `Failed to ${action} franchise schedules`);
}

export async function readBody(request: Request): Promise<JsonRecord> {
    const parsed: unknown = await request.json().catch((error: unknown) => {
        if (error instanceof SyntaxError) return {};
        throw error;
    });
    return isRecord(parsed) ? parsed : {};
}

export async function fetchActiveRequester(
    supabaseAdmin: SupabaseAdminClient,
    request: Request,
    dependencies: FranchiseScheduleRouteDependencies
): Promise<{ readonly requester: ActiveRequesterProfile | null; readonly response: Response | null }> {
    const resolved = await dependencies.resolveRequester(supabaseAdmin, request);
    if (!resolved?.id) return { requester: null, response: fail(401, 'AUTH_REQUIRED', 'authenticated session is required') };
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, company_id, role, status')
        .eq('id', resolved.id)
        .maybeSingle<ProfileRow>();
    if (error) throw error;
    if (!data || data.status !== 'active') {
        return { requester: null, response: fail(403, 'FORBIDDEN', 'active requester is required') };
    }
    return { requester: data, response: null };
}

async function fetchProfile(supabaseAdmin: SupabaseAdminClient, profileId: string): Promise<ProfileRow | null> {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, company_id, role, status')
        .eq('id', profileId)
        .maybeSingle<ProfileRow>();
    if (error) throw error;
    return data || null;
}

export async function assertAssignableProfile(
    supabaseAdmin: SupabaseAdminClient,
    profileId: string | null,
    companyId: string,
    managerOnly: boolean
): Promise<Response | null> {
    if (!profileId) return null;
    const profile = await fetchProfile(supabaseAdmin, profileId);
    if (!profile || profile.company_id !== companyId || profile.status !== 'active') {
        return fail(403, 'FORBIDDEN', 'target profile must be active and in the requester company');
    }
    if (managerOnly && !isManagerRole(profile.role)) {
        return fail(403, 'FORBIDDEN', 'manager_profile_id must be an active company manager');
    }
    return null;
}

export function transformSchedule(row: unknown): JsonRecord | null {
    if (!isRecord(row)) return null;
    return {
        id: row.id,
        companyId: row.company_id,
        creatorProfileId: row.creator_profile_id,
        assigneeProfileId: row.assignee_profile_id,
        managerProfileId: row.manager_profile_id,
        title: row.title,
        date: row.date,
        status: row.status,
        type: row.type,
        color: row.color,
        details: row.details,
        sourceType: cleanString(row.source_type),
        sourceId: cleanString(row.source_id),
        dueAt: row.due_at,
        remindAt: row.remind_at,
        completedAt: row.completed_at,
        metadata: isRecord(row.metadata) ? row.metadata : {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function requestedCompanyId(requester: ActiveRequesterProfile, searchParams: URLSearchParams): string | null {
    return cleanString(searchParams.get('companyId')) || requester.company_id;
}

export async function listSchedules(
    request: Request,
    dependencies: FranchiseScheduleRouteDependencies
): Promise<Response> {
    const supabaseAdmin = dependencies.getSupabaseAdmin();
    const access = await fetchActiveRequester(supabaseAdmin, request, dependencies);
    if (access.response) return access.response;
    const requester = access.requester;
    if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

    const { searchParams } = new URL(request.url);
    const companyId = requestedCompanyId(requester, searchParams);
    if (!companyId || requester.company_id !== companyId) return fail(403, 'FORBIDDEN', 'cross-company access denied');

    let query = supabaseAdmin
        .from('franchise_schedules')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

    const dateFrom = cleanString(searchParams.get('dateFrom'));
    const dateTo = cleanString(searchParams.get('dateTo'));
    const status = cleanString(searchParams.get('status'));
    const source = cleanString(searchParams.get('source')) || cleanString(searchParams.get('sourceType'));
    const assignee = cleanString(searchParams.get('assigneeProfileId')) || cleanString(searchParams.get('assignee_profile_id'));
    const manager = cleanString(searchParams.get('managerProfileId')) || cleanString(searchParams.get('manager_profile_id'));
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    if (status) query = query.eq('status', status);
    if (source) query = source === 'manual' ? query.is('source_type', null) : query.eq('source_type', source);
    if (assignee) query = query.eq('assignee_profile_id', assignee);
    if (manager) query = query.eq('manager_profile_id', manager);

    const { data, error } = await query;
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    return ok(rows.map(transformSchedule));
}

export async function createSchedule(
    request: Request,
    dependencies: FranchiseScheduleRouteDependencies
): Promise<Response> {
    const supabaseAdmin = dependencies.getSupabaseAdmin();
    const body = await readBody(request);
    const access = await fetchActiveRequester(supabaseAdmin, request, dependencies);
    if (access.response) return access.response;
    const requester = access.requester;
    if (!requester?.company_id) return fail(403, 'FORBIDDEN', 'company requester is required');
    if (cleanString(valueFor(body, 'sourceType', 'source_type')) || cleanString(valueFor(body, 'sourceId', 'source_id'))) {
        return fail(403, 'FORBIDDEN', 'source schedules must be managed through their workflow');
    }
    const companyId = cleanString(valueFor(body, 'companyId', 'company_id')) || requester.company_id;
    if (companyId !== requester.company_id) return fail(403, 'FORBIDDEN', 'cross-company create denied');
    const canAssign = isManagerRole(requester.role);
    const creatorId = cleanString(valueFor(body, 'creatorProfileId', 'creator_profile_id')) || requester.id;
    const assigneeId = cleanString(valueFor(body, 'assigneeProfileId', 'assignee_profile_id')) || requester.id;
    const managerId = cleanString(valueFor(body, 'managerProfileId', 'manager_profile_id')) || null;
    if (!canAssign && (creatorId !== requester.id || assigneeId !== requester.id || managerId)) {
        return fail(403, 'FORBIDDEN', 'staff can only create their own manual schedules');
    }
    const title = cleanString(body.title);
    const date = cleanString(body.date);
    if (!title || !date) return fail(400, 'VALIDATION_ERROR', 'title and date are required');
    for (const [profileId, managerOnly] of [[creatorId, false], [assigneeId, false], [managerId, true]] as const) {
        const profileError = await assertAssignableProfile(supabaseAdmin, profileId, companyId, managerOnly);
        if (profileError) return profileError;
    }
    const { data, error } = await supabaseAdmin
        .from('franchise_schedules')
        .insert({
            id: randomUUID(),
            company_id: companyId,
            creator_profile_id: creatorId,
            assignee_profile_id: assigneeId,
            manager_profile_id: managerId,
            title,
            date,
            status: cleanString(body.status) || '예정',
            type: cleanString(body.type) || null,
            color: cleanString(body.color) || null,
            details: cleanString(body.details) || null,
            due_at: cleanString(valueFor(body, 'dueAt', 'due_at')) || null,
            remind_at: cleanString(valueFor(body, 'remindAt', 'remind_at')) || null,
            metadata: isRecord(body.metadata) ? body.metadata : {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select('*')
        .single<ScheduleRow>();
    if (error) throw error;
    return ok(transformSchedule(data), 201);
}
