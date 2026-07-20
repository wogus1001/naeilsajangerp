import {
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    resolveUserUuid,
    type RequesterProfile
} from '@/lib/api-auth';
import { fail } from '@/lib/api-response';
import { canAccessFranchiseLocation } from '@/lib/franchise-location-access';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    mergeOpeningProjectTasks,
    normalizeOpeningProjectStatus,
    summarizeOpeningProjectTasks,
    type OpeningProjectTaskInput
} from '@/lib/franchise-opening-projects';

export type JsonRecord = Record<string, unknown>;

export type FranchiseLocationRow = {
    id: string;
    company_id: string | null;
    manager_id: string | null;
    created_by: string | null;
    name: string | null;
    status: string | null;
};

export type OpeningProjectRow = {
    id: string;
    company_id: string;
    location_id: string;
    manager_id: string | null;
    status: string | null;
    target_open_date: string | null;
    memo: string | null;
    tasks: unknown;
    data: unknown;
    created_at: string;
    updated_at: string;
};

const CONTROL_FIELDS = new Set([
    'id',
    'requesterId',
    'userId',
    'companyName',
    'companyId',
    'locationId',
    'location_id',
    'managerId',
    'manager_id',
    'status',
    'targetOpenDate',
    'target_open_date',
    'memo',
    'tasks'
]);

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getFirst(body: JsonRecord, keys: readonly string[]) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
    }
    return undefined;
}

function hasAny(body: JsonRecord, keys: readonly string[]) {
    return keys.some(key => Object.prototype.hasOwnProperty.call(body, key));
}

export function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function parseNullableDate(value: unknown): string | null {
    const raw = cleanString(value);
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function readJsonRecord(value: unknown): JsonRecord {
    return isRecord(value) ? value : {};
}

export function readOpeningProjectLeadId(value: unknown): string | null {
    return cleanString(readJsonRecord(value).leadId);
}

function readTasks(value: unknown): readonly OpeningProjectTaskInput[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).map(item => ({
        id: cleanString(item.id) || '',
        label: cleanString(item.label) || undefined,
        status: cleanString(item.status),
        owner: cleanString(item.owner),
        dueDate: cleanString(item.dueDate ?? item.due_date),
        memo: cleanString(item.memo)
    })).filter(task => task.id);
}

export async function readOpeningProjectBody(request: Request): Promise<JsonRecord> {
    try {
        const parsed = await request.json();
        return isRecord(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

export function requesterFallback(body: JsonRecord) {
    return cleanString(getFirst(body, ['requesterId', 'userId', 'managerId', 'manager_id']));
}

function buildDataPayload(body: JsonRecord, existingData: JsonRecord = {}) {
    const extras: JsonRecord = {};
    Object.entries(body).forEach(([key, value]) => {
        if (!CONTROL_FIELDS.has(key)) extras[key] = value;
    });
    return {
        ...existingData,
        ...extras,
        ...(body.companyName !== undefined ? { companyName: body.companyName } : {}),
        ...(body.managerId !== undefined ? { managerId: body.managerId } : {})
    };
}

export function transformOpeningProject(row: OpeningProjectRow) {
    const tasks = mergeOpeningProjectTasks(readTasks(row.tasks));
    return {
        ...readJsonRecord(row.data),
        id: row.id,
        companyId: row.company_id,
        locationId: row.location_id,
        managerId: row.manager_id,
        status: normalizeOpeningProjectStatus(row.status),
        targetOpenDate: row.target_open_date,
        memo: row.memo || '',
        tasks,
        summary: summarizeOpeningProjectTasks(tasks),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export async function getOpeningProjectRequester(
    request: Request,
    body?: JsonRecord
) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabaseAdmin, request, body ? requesterFallback(body) : null);
    return { supabaseAdmin, requester };
}

export async function resolveOpeningProjectCompanyScope(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    requester: RequesterProfile,
    companyName: string | null
) {
    const requestedCompanyId = companyName ? await resolveCompanyIdByName(supabaseAdmin, companyName) : null;
    if (companyName && !requestedCompanyId) return { empty: true };
    if (isAdmin(requester)) return { companyId: requestedCompanyId };
    if (requester.company_id) {
        if (requestedCompanyId && requestedCompanyId !== requester.company_id) {
            return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied') };
        }
        return { companyId: requester.company_id };
    }
    return { managerId: requester.id };
}

export async function fetchOpeningReadyLocation(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    locationId: string,
    requester: RequesterProfile
) {
    const { data, error } = await supabaseAdmin
        .from('franchise_locations')
        .select('id, company_id, manager_id, created_by, name, status')
        .eq('id', locationId)
        .single();

    const location = data as FranchiseLocationRow | null;
    if (error || !location) return { error: fail(404, 'NOT_FOUND', 'Franchise location not found') };
    if (!canAccessFranchiseLocation(requester, location)) {
        return { error: fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied') };
    }
    if (!location.company_id) return { error: fail(400, 'VALIDATION_ERROR', 'Company scope is required') };
    if (location.status !== '오픈준비') {
        return { error: fail(400, 'VALIDATION_ERROR', 'Only opening-ready locations can have opening projects') };
    }
    return { location };
}

export async function resolveOpeningProjectManagerId(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    body: JsonRecord,
    requester: RequesterProfile,
    location: FranchiseLocationRow
) {
    const rawManager = cleanString(getFirst(body, ['managerId', 'manager_id']));
    const managerId = rawManager
        ? await resolveUserUuid(supabaseAdmin, rawManager)
        : location.manager_id || (isAdmin(requester) ? null : requester.id);

    if (rawManager && !managerId) return { error: fail(400, 'VALIDATION_ERROR', 'Manager not found') };
    if (!managerId) return { managerId: null };

    const { data } = await supabaseAdmin
        .from('profiles')
        .select('company_id, status')
        .eq('id', managerId)
        .maybeSingle();

    if (!data || data.company_id !== location.company_id || data.status !== 'active') {
        return { error: fail(403, 'FORBIDDEN', 'Forbidden: manager/company mismatch') };
    }
    return { managerId };
}

export function buildOpeningProjectPayload(
    body: JsonRecord,
    location: FranchiseLocationRow,
    managerId: string | null,
    existing?: OpeningProjectRow | null
) {
    return {
        company_id: location.company_id,
        location_id: location.id,
        manager_id: managerId,
        status: hasAny(body, ['status']) ? normalizeOpeningProjectStatus(getFirst(body, ['status'])) : normalizeOpeningProjectStatus(existing?.status),
        target_open_date: hasAny(body, ['targetOpenDate', 'target_open_date'])
            ? parseNullableDate(getFirst(body, ['targetOpenDate', 'target_open_date']))
            : existing?.target_open_date || null,
        memo: hasAny(body, ['memo']) ? cleanString(getFirst(body, ['memo'])) || '' : existing?.memo || '',
        tasks: hasAny(body, ['tasks']) ? mergeOpeningProjectTasks(readTasks(getFirst(body, ['tasks']))) : mergeOpeningProjectTasks(readTasks(existing?.tasks)),
        updated_at: new Date().toISOString(),
        data: buildDataPayload(body, readJsonRecord(existing?.data))
    };
}

export function buildOpeningProjectUpdates(body: JsonRecord, existing: OpeningProjectRow) {
    const updates: JsonRecord = {
        updated_at: new Date().toISOString(),
        data: buildDataPayload(body, readJsonRecord(existing.data))
    };
    if (hasAny(body, ['status'])) updates.status = normalizeOpeningProjectStatus(getFirst(body, ['status']));
    if (hasAny(body, ['targetOpenDate', 'target_open_date'])) {
        updates.target_open_date = parseNullableDate(getFirst(body, ['targetOpenDate', 'target_open_date']));
    }
    if (hasAny(body, ['memo'])) updates.memo = cleanString(getFirst(body, ['memo'])) || '';
    if (hasAny(body, ['tasks'])) updates.tasks = mergeOpeningProjectTasks(readTasks(getFirst(body, ['tasks'])));
    return updates;
}
