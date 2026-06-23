import type { SupabaseClient } from '@supabase/supabase-js';

import { cleanString, isRecord, type LocationRequestBody } from '@/lib/franchise-location-api-payload';
import { formatManagerDisplayName } from '@/lib/franchise-manager-display';

export type ManagerReferenceRow = {
    readonly manager_id?: string | null;
};

type ManagerProfileRow = {
    readonly id: string;
    readonly name: string | null;
    readonly role: string | null;
};

type FranchiseLocationApiRow = ManagerReferenceRow & {
    readonly id: string;
    readonly company_id: string | null;
    readonly name: string | null;
    readonly location_type: string | null;
    readonly brand: string | null;
    readonly status: string | null;
    readonly region: string | null;
    readonly address: string | null;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly opened_at: string | null;
    readonly source_property_id: string | null;
    readonly contract_lead_id?: string | null;
    readonly source_location_id?: string | null;
    readonly source_external_listing_id?: string | null;
    readonly contracted_at?: string | null;
    readonly created_by: string | null;
    readonly memo: string | null;
    readonly created_at: string | null;
    readonly updated_at: string | null;
    readonly data: unknown;
};

function getManagerDisplayName(profile: ManagerProfileRow): string {
    return formatManagerDisplayName({
        id: profile.id,
        name: cleanString(profile.name) || '이름 미등록',
        role: profile.role
    });
}

export async function fetchLocationManagerNameMap(
    supabaseAdmin: SupabaseClient,
    rows: readonly ManagerReferenceRow[]
): Promise<ReadonlyMap<string, string>> {
    const managerIds = Array.from(new Set(
        rows.map(row => cleanString(row.manager_id)).filter((managerId): managerId is string => Boolean(managerId))
    ));
    if (managerIds.length === 0) return new Map<string, string>();

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name, role')
        .in('id', managerIds)
        .returns<ManagerProfileRow[]>();

    if (error) {
        console.warn('Failed to fetch franchise location manager names:', error);
        return new Map<string, string>();
    }

    return new Map((data || []).map(profile => [profile.id, getManagerDisplayName(profile)]));
}

export function transformLocation(row: FranchiseLocationApiRow | null, managerNames: ReadonlyMap<string, string> = new Map()) {
    if (!row) return null;
    const data: LocationRequestBody = isRecord(row.data) ? row.data : {};
    const managerId = cleanString(row.manager_id);
    return {
        ...data,
        id: row.id,
        companyId: row.company_id,
        managerId,
        managerName: managerId ? managerNames.get(managerId) || '' : '',
        name: row.name || '',
        locationType: row.location_type || '예정점',
        brand: row.brand || '',
        status: row.status || '검토중',
        region: row.region || '',
        address: row.address || '',
        latitude: row.latitude,
        longitude: row.longitude,
        openedAt: row.opened_at,
        sourcePropertyId: row.source_property_id,
        contractLeadId: cleanString(row.contract_lead_id) || '',
        sourceLocationId: cleanString(row.source_location_id) || '',
        sourceExternalListingId: cleanString(row.source_external_listing_id) || '',
        contractedAt: row.contracted_at || '',
        createdBy: row.created_by,
        memo: row.memo || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
