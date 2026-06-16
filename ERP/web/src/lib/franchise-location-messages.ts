import type { SupabaseClient } from '@supabase/supabase-js';
import { canAccessCompanyResource, type RequesterProfile } from '@/lib/api-auth';

export const LOCATION_MESSAGE_KINDS = ['note', 'request'] as const;
export const LOCATION_REQUEST_STATUSES = ['open', 'done'] as const;

export type LocationMessageKind = typeof LOCATION_MESSAGE_KINDS[number];
export type LocationRequestStatus = typeof LOCATION_REQUEST_STATUSES[number];

export type FranchiseLocationMessage = {
    readonly id: string;
    readonly companyId: string;
    readonly locationId: string;
    readonly authorId: string;
    readonly authorName: string;
    readonly body: string;
    readonly kind: LocationMessageKind;
    readonly requestStatus: LocationRequestStatus | null;
    readonly resolvedBy: string | null;
    readonly resolvedByName: string;
    readonly resolvedAt: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
};

export type FranchiseLocationMessageSummary = {
    readonly locationId: string;
    readonly totalCount: number;
    readonly openRequestCount: number;
    readonly latestMessageAt: string | null;
};

type LocationAccessRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
};

type LocationAccessResult =
    | { readonly row: LocationAccessRow; readonly status: 200 }
    | { readonly row: null; readonly status: 403 | 404 | 500 };

type LocationMessageRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly author_id: string;
    readonly body: string;
    readonly kind: string;
    readonly request_status: string | null;
    readonly resolved_by: string | null;
    readonly resolved_at: string | null;
    readonly created_at: string;
    readonly updated_at: string;
};

type ProfileNameRow = {
    readonly id: string;
    readonly name: string | null;
};

export const LOCATION_MESSAGE_SELECT = [
    'id',
    'company_id',
    'location_id',
    'author_id',
    'body',
    'kind',
    'request_status',
    'resolved_by',
    'resolved_at',
    'created_at',
    'updated_at'
].join(', ');

export function cleanMessageString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

export function toLocationMessageKind(value: unknown): LocationMessageKind {
    return value === 'request' ? 'request' : 'note';
}

export function toLocationRequestStatus(value: unknown): LocationRequestStatus | null {
    if (value === 'open' || value === 'done') return value;
    return null;
}

export function isLocationMessagesSchemaError(error: { readonly code?: string; readonly message?: string } | null): boolean {
    if (!error) return false;
    return error.code === '42P01'
        || error.code === 'PGRST205'
        || Boolean(error.message?.includes('franchise_location_messages'));
}

export async function fetchAccessibleLocationRow(
    supabaseAdmin: SupabaseClient,
    locationId: string,
    requester: RequesterProfile
): Promise<LocationAccessResult> {
    const { data, error } = await supabaseAdmin
        .from('franchise_locations')
        .select('id, company_id, manager_id')
        .eq('id', locationId)
        .maybeSingle();

    if (error) {
        console.error('Failed to fetch franchise location for messages:', error);
        return { row: null, status: 500 };
    }

    const row = data as LocationAccessRow | null;
    if (!row) return { row: null, status: 404 };
    if (!canAccessCompanyResource(requester, row)) return { row: null, status: 403 };

    return { row, status: 200 };
}

async function fetchProfileNameMap(
    supabaseAdmin: SupabaseClient,
    ids: readonly string[]
): Promise<ReadonlyMap<string, string>> {
    const profileIds = Array.from(new Set(ids.filter(Boolean)));
    if (profileIds.length === 0) return new Map<string, string>();

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .in('id', profileIds);

    if (error) {
        console.warn('Failed to fetch franchise location message authors:', error);
        return new Map<string, string>();
    }

    return new Map((data as readonly ProfileNameRow[] | null || []).map(profile => [
        profile.id,
        cleanMessageString(profile.name) || '이름 미등록'
    ]));
}

export async function transformLocationMessageRows(
    supabaseAdmin: SupabaseClient,
    rows: readonly LocationMessageRow[]
): Promise<readonly FranchiseLocationMessage[]> {
    const nameMap = await fetchProfileNameMap(
        supabaseAdmin,
        rows.flatMap(row => [row.author_id, row.resolved_by || ''])
    );

    return rows.map(row => {
        const kind = toLocationMessageKind(row.kind);
        const requestStatus = kind === 'request'
            ? toLocationRequestStatus(row.request_status) || 'open'
            : null;

        return {
            id: row.id,
            companyId: row.company_id,
            locationId: row.location_id,
            authorId: row.author_id,
            authorName: nameMap.get(row.author_id) || '이름 미등록',
            body: row.body,
            kind,
            requestStatus,
            resolvedBy: row.resolved_by,
            resolvedByName: row.resolved_by ? nameMap.get(row.resolved_by) || '담당자' : '',
            resolvedAt: row.resolved_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    });
}

export function buildLocationMessageSummary(
    locationId: string,
    rows: readonly Pick<LocationMessageRow, 'location_id' | 'kind' | 'request_status' | 'created_at'>[]
): FranchiseLocationMessageSummary {
    const targetRows = rows.filter(row => row.location_id === locationId);
    const latestMessageAt = targetRows.reduce<string | null>((latest, row) => {
        if (!latest) return row.created_at;
        return new Date(row.created_at).getTime() > new Date(latest).getTime() ? row.created_at : latest;
    }, null);

    return {
        locationId,
        totalCount: targetRows.length,
        openRequestCount: targetRows.filter(row => row.kind === 'request' && row.request_status === 'open').length,
        latestMessageAt
    };
}

export type { LocationAccessRow, LocationMessageRow };
