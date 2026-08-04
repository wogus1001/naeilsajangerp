import type { SupabaseClient } from '@supabase/supabase-js';
import {
    getAuthenticatedRequesterProfile,
    type RequesterProfile
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { canAccessFranchiseLead } from '@/lib/franchise-lead-access';
import { canAccessFranchiseLocation } from '@/lib/franchise-location-access';
import {
    buildContractStoreLocationDraft,
    getExistingContractStoreLinkError,
    getContractStoreDraftValidationError,
    readContractStoreSourceType,
    type ContractStoreDraftInput,
    type ContractStoreLeadInput,
    type ContractStoreSourceInput
} from '@/lib/franchise-contract-store';
import { isLeadLocationCandidate } from '@/lib/franchise-lead-location-links';
import {
    buildInsertPayload,
    cleanString,
    getFirst,
    isRecord,
    type LocationRequestBody
} from '@/lib/franchise-location-api-payload';
import {
    fetchLocationManagerNameMap,
    transformLocation
} from '@/lib/franchise-location-api-response';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type FranchiseLeadRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly created_by: string | null;
    readonly name: string | null;
    readonly mobile: string | null;
    readonly status: string | null;
    readonly interested_brand: string | null;
    readonly desired_region: string | null;
    readonly budget_min: number | null;
    readonly budget_max: number | null;
};

type FranchiseLocationSourceRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id?: string | null;
    readonly created_by?: string | null;
    readonly name: string | null;
    readonly location_type: string | null;
    readonly brand: string | null;
    readonly status: string | null;
    readonly region: string | null;
    readonly address: string | null;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly source_property_id: string | null;
    readonly memo: string | null;
};

type ExistingFranchiseLocationRow = FranchiseLocationSourceRow & {
    readonly contract_lead_id?: string | null;
    readonly contracted_at?: string | null;
};

type ExternalListingSourceRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly requester_id: string | null;
    readonly title: string | null;
    readonly address: string | null;
    readonly region: string | null;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly source: string | null;
    readonly deposit_amount: number | null;
    readonly monthly_rent: number | null;
    readonly sale_price: number | null;
    readonly maintenance_fee: number | null;
    readonly area_pyeong: string | null;
    readonly floor_info: string | null;
};

function getErrorCode(error: unknown): string {
    if (!error || typeof error !== 'object' || !('code' in error)) return '';
    return typeof error.code === 'string' ? error.code : '';
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (!error || typeof error !== 'object' || !('message' in error)) return '';
    return typeof error.message === 'string' ? error.message : '';
}

function isMissingContractStoreSchemaError(error: unknown): boolean {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    return ['PGRST204', '42703'].includes(code)
        && /contract_lead_id|source_location_id|source_external_listing_id|contracted_at/i.test(message);
}

function toLeadInput(row: FranchiseLeadRow): ContractStoreLeadInput {
    return {
        id: row.id,
        companyId: row.company_id || '',
        managerId: row.manager_id || null,
        name: row.name || '',
        mobile: row.mobile || '',
        status: row.status || '',
        interestedBrand: row.interested_brand || '',
        desiredRegion: row.desired_region || '',
        budgetMin: row.budget_min,
        budgetMax: row.budget_max
    };
}

function readDraftInput(body: LocationRequestBody): ContractStoreDraftInput {
    const source = isRecord(body.draft) ? body.draft : body;
    return {
        name: cleanString(getFirst(source, ['name', 'storeName'])) || undefined,
        brand: cleanString(source.brand) || undefined,
        region: cleanString(source.region) || undefined,
        address: cleanString(source.address) || undefined,
        latitude: typeof source.latitude === 'number' ? source.latitude : null,
        longitude: typeof source.longitude === 'number' ? source.longitude : null,
        openedAt: cleanString(getFirst(source, ['openedAt', 'opened_at'])) || undefined,
        memo: cleanString(source.memo) || undefined
    };
}

async function fetchContractStoreByLeadId(
    supabaseAdmin: SupabaseClient,
    leadId: string,
    companyId: string
) {
    return supabaseAdmin
        .from('franchise_locations')
        .select('*')
        .eq('company_id', companyId)
        .eq('contract_lead_id', leadId)
        .maybeSingle();
}

async function fetchLead(
    supabaseAdmin: SupabaseClient,
    leadId: string
): Promise<{ readonly lead: FranchiseLeadRow | null; readonly error: unknown }> {
    const { data, error } = await supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, created_by, name, mobile, status, interested_brand, desired_region, budget_min, budget_max')
        .eq('id', leadId)
        .maybeSingle();
    return { lead: data as FranchiseLeadRow | null, error };
}

async function fetchFranchiseLocationSource(
    supabaseAdmin: SupabaseClient,
    requester: RequesterProfile,
    lead: FranchiseLeadRow,
    sourceId: string
): Promise<{ readonly source: ContractStoreSourceInput | null; readonly response: Response | null }> {
    const { data, error } = await supabaseAdmin
        .from('franchise_locations')
        .select('id, company_id, manager_id, created_by, name, location_type, brand, status, region, address, latitude, longitude, source_property_id, memo')
        .eq('id', sourceId)
        .maybeSingle();
    if (error) throw error;
    const row = data as FranchiseLocationSourceRow | null;
    if (!row) return { source: null, response: fail(404, 'NOT_FOUND', 'Source location not found') };
    if (!canAccessFranchiseLocation(requester, row) || row.company_id !== lead.company_id) {
        return { source: null, response: fail(403, 'FORBIDDEN', 'Forbidden: source location access denied') };
    }
    if (!isLeadLocationCandidate({
        id: row.id,
        locationType: row.location_type,
        status: row.status
    })) {
        return {
            source: null,
            response: fail(409, 'CONFLICT', '출점 후보지 상태의 항목만 가맹 운영으로 전환할 수 있습니다.')
        };
    }
    return {
        response: null,
        source: {
            id: row.id,
            sourceType: 'franchise_location',
            name: row.name || '',
            locationType: row.location_type,
            brand: row.brand,
            status: row.status,
            region: row.region,
            address: row.address,
            latitude: row.latitude,
            longitude: row.longitude,
            sourcePropertyId: row.source_property_id,
            memo: row.memo
        }
    };
}

async function fetchExternalListingSource(
    supabaseAdmin: SupabaseClient,
    requester: RequesterProfile,
    lead: FranchiseLeadRow,
    sourceId: string
): Promise<{ readonly source: ContractStoreSourceInput | null; readonly response: Response | null }> {
    const { data, error } = await supabaseAdmin
        .from('external_property_listings')
        .select('id, company_id, requester_id, title, address, region, latitude, longitude, source, deposit_amount, monthly_rent, sale_price, maintenance_fee, area_pyeong, floor_info')
        .eq('id', sourceId)
        .maybeSingle();
    if (error) throw error;
    const row = data as ExternalListingSourceRow | null;
    if (!row) return { source: null, response: fail(404, 'NOT_FOUND', 'External listing not found') };
    const sameCompany = Boolean(row.company_id && row.company_id === lead.company_id);
    const ownedRequester = Boolean(!row.company_id && row.requester_id === requester.id);
    if (requester.role !== 'admin' && !sameCompany && !ownedRequester) {
        return { source: null, response: fail(403, 'FORBIDDEN', 'Forbidden: external listing access denied') };
    }
    return {
        response: null,
        source: {
            id: row.id,
            sourceType: 'external_property_listing',
            name: row.title || row.address || '외부 상가',
            title: row.title || '',
            region: row.region,
            address: row.address,
            latitude: row.latitude,
            longitude: row.longitude,
            brand: '',
            status: row.source,
            depositAmount: row.deposit_amount,
            monthlyRent: row.monthly_rent,
            salePrice: row.sale_price,
            maintenanceFee: row.maintenance_fee,
            areaPyeong: row.area_pyeong,
            floorInfo: row.floor_info
        }
    };
}

async function resolveSource(
    supabaseAdmin: SupabaseClient,
    requester: RequesterProfile,
    lead: FranchiseLeadRow,
    body: LocationRequestBody
) {
    const sourceType = readContractStoreSourceType(getFirst(body, ['sourceType', 'source_type', 'targetType', 'target_type']));
    const sourceId = cleanString(getFirst(body, ['sourceId', 'source_id', 'targetId', 'target_id']));
    if (sourceType === 'direct' || !sourceId) return { source: null, response: null };
    if (sourceType === 'franchise_location') {
        return fetchFranchiseLocationSource(supabaseAdmin, requester, lead, sourceId);
    }
    return fetchExternalListingSource(supabaseAdmin, requester, lead, sourceId);
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const bodyRaw: unknown = await request.json().catch(() => null);
        if (!isRecord(bodyRaw)) return fail(400, 'VALIDATION_ERROR', 'Invalid request body');

        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const leadId = cleanString(getFirst(bodyRaw, ['leadId', 'lead_id']));
        if (!leadId) return fail(400, 'VALIDATION_ERROR', 'leadId is required');

        const { lead, error: leadError } = await fetchLead(supabaseAdmin, leadId);
        if (leadError) throw leadError;
        if (!lead) return fail(404, 'NOT_FOUND', 'Franchise lead not found');
        if (!canAccessFranchiseLead(requester, lead)) return fail(403, 'FORBIDDEN', 'Forbidden: lead access denied');
        if (lead.status !== '계약완료') return fail(400, 'VALIDATION_ERROR', '계약완료 상태의 점주만 가맹점 정보로 전환할 수 있습니다.');
        if (!lead.company_id) return fail(400, 'VALIDATION_ERROR', 'Lead company scope is required');

        const existing = await fetchContractStoreByLeadId(supabaseAdmin, lead.id, lead.company_id);
        if (existing.error) throw existing.error;
        if (existing.data) {
            const managerNames = await fetchLocationManagerNameMap(supabaseAdmin, [existing.data]);
            return ok({ location: transformLocation(existing.data, managerNames), created: false });
        }

        const action = cleanString(bodyRaw.action);
        if (action === 'link_existing') {
            const locationId = cleanString(getFirst(bodyRaw, ['locationId', 'location_id']));
            if (!locationId) return fail(400, 'VALIDATION_ERROR', '연결할 가맹점을 선택해주세요.');

            const { data: locationData, error: locationError } = await supabaseAdmin
                .from('franchise_locations')
                .select('*')
                .eq('id', locationId)
                .maybeSingle();
            if (locationError) throw locationError;

            const location = locationData as ExistingFranchiseLocationRow | null;
            if (!location) return fail(404, 'NOT_FOUND', '연결할 가맹점을 찾지 못했습니다.');
            if (!canAccessFranchiseLocation(requester, location) || location.company_id !== lead.company_id) {
                return fail(403, 'FORBIDDEN', 'Forbidden: existing store access denied');
            }

            const linkError = getExistingContractStoreLinkError({
                id: location.id,
                locationType: location.location_type,
                status: location.status,
                contractLeadId: location.contract_lead_id
            }, lead.id);
            if (linkError) return fail(409, 'CONFLICT', linkError);

            const nowIso = new Date().toISOString();
            const { data: linkedLocation, error: linkErrorResult } = await supabaseAdmin
                .from('franchise_locations')
                .update({
                    contract_lead_id: lead.id,
                    contracted_at: location.contracted_at || nowIso,
                    updated_at: nowIso
                })
                .eq('id', location.id)
                .is('contract_lead_id', null)
                .select()
                .maybeSingle();
            if (linkErrorResult) throw linkErrorResult;
            if (!linkedLocation) {
                return fail(409, 'CONFLICT', '다른 화면에서 가맹점 연결 상태가 변경되었습니다. 다시 확인해주세요.');
            }

            const managerNames = await fetchLocationManagerNameMap(supabaseAdmin, [linkedLocation]);
            return ok({ location: transformLocation(linkedLocation, managerNames), created: false, linked: true });
        }

        const sourceResult = await resolveSource(supabaseAdmin, requester, lead, bodyRaw);
        if (sourceResult.response) return sourceResult.response;

        const draft = buildContractStoreLocationDraft({
            lead: toLeadInput(lead),
            source: sourceResult.source,
            draft: readDraftInput(bodyRaw),
            nowIso: new Date().toISOString()
        });
        const validationError = getContractStoreDraftValidationError(draft);
        if (validationError) return fail(400, 'VALIDATION_ERROR', validationError);

        const locationBody: LocationRequestBody = { ...draft };
        const insert = buildInsertPayload(locationBody, lead.company_id, lead.manager_id, requester.id);
        if (insert.error) return insert.error;

        const { data: inserted, error: insertError } = await supabaseAdmin
            .from('franchise_locations')
            .insert(insert.payload)
            .select()
            .single();
        if (insertError) throw insertError;

        const managerNames = await fetchLocationManagerNameMap(supabaseAdmin, [inserted]);
        return ok({ location: transformLocation(inserted, managerNames), created: true }, 201);
    } catch (error) {
        console.error('Contract store POST error:', error);
        if (getErrorCode(error) === '23505') {
            return fail(409, 'CONFLICT', '이미 다른 계약 점주 또는 가맹점과 연결되어 있습니다.');
        }
        if (isMissingContractStoreSchemaError(error)) {
            return fail(
                424,
                'VALIDATION_ERROR',
                '계약 완료 점주 가맹점 연동 SQL이 아직 적용되지 않았습니다. supabase_franchise_contract_store_linkage_migration.sql 적용 후 다시 시도해주세요.'
            );
        }
        return fail(500, 'INTERNAL_ERROR', 'Failed to create contract store location');
    }
}
