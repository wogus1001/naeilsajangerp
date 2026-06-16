import type { FranchiseBrand } from '@/lib/franchise-brands';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import type {
    FranchiseLead,
    FranchiseLocation,
    LeadListResponse,
    LocationFormState,
    LocationListResponse,
    LocationManagerOption
} from './locationMasterTypes';

type RequestScope = {
    readonly userId: string;
    readonly companyName: string;
};

type FetchMarketInsightDataResult = {
    readonly leads: readonly FranchiseLead[];
    readonly locations: readonly FranchiseLocation[];
};

type SaveBrandMasterParams = RequestScope & {
    readonly form: LocationFormState;
};

type SaveFranchiseLocationParams = RequestScope & {
    readonly form: LocationFormState;
    readonly region: string;
};

type DeleteFranchiseLocationParams = RequestScope & {
    readonly locationId: string;
};

type ScanLocationCompetitorsParams = RequestScope & {
    readonly locationId: string;
    readonly query: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringField(source: unknown, key: string): string {
    if (!isRecord(source)) return '';
    const value = source[key];
    return typeof value === 'string' ? value.trim() : '';
}

function toLocationManagerOption(source: unknown): LocationManagerOption | null {
    const role = getStringField(source, 'role').toLowerCase();
    if (role === 'admin' || role === 'super_admin') return null;

    const uuid = getStringField(source, 'uuid');
    const displayId = getStringField(source, 'id') || uuid;
    const id = uuid || displayId;
    if (!id) return null;

    return {
        id,
        displayId,
        name: getStringField(source, 'name') || '이름 미등록'
    };
}

function isLocationManagerOption(value: LocationManagerOption | null): value is LocationManagerOption {
    return value !== null;
}

export async function fetchLocationManagers({
    userId,
    companyName
}: RequestScope): Promise<readonly LocationManagerOption[]> {
    if (!companyName.trim()) return [];

    const params = new URLSearchParams({ requesterId: userId });
    params.set('company', companyName);

    const response = await fetch(`/api/users?${params.toString()}`, { cache: 'no-store' });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(readApiError(payload));
    if (!Array.isArray(payload)) return [];

    return payload.map(toLocationManagerOption).filter(isLocationManagerOption);
}

export async function fetchMarketInsightData({
    userId,
    companyName
}: RequestScope): Promise<FetchMarketInsightDataResult> {
    const leadParams = new URLSearchParams({ requesterId: userId, limit: 'all', summary: 'true' });
    const locationParams = new URLSearchParams({ requesterId: userId });
    if (companyName) {
        leadParams.set('company', companyName);
        locationParams.set('company', companyName);
    }
    const [leadResponse, locationResponse] = await Promise.all([
        fetch(`/api/franchise-leads?${leadParams.toString()}`, { cache: 'no-store' }),
        fetch(`/api/franchise-locations?${locationParams.toString()}`, { cache: 'no-store' })
    ]);
    const [leadPayload, locationPayload]: readonly unknown[] = await Promise.all([
        leadResponse.json(),
        locationResponse.json()
    ]);
    if (!leadResponse.ok) throw new Error(readApiError(leadPayload));
    if (!locationResponse.ok) throw new Error(readApiError(locationPayload));
    return {
        leads: unwrapApiData<LeadListResponse>(leadPayload).leads || [],
        locations: unwrapApiData<LocationListResponse>(locationPayload).locations || []
    };
}

export async function saveBrandMaster({
    userId,
    companyName,
    form
}: SaveBrandMasterParams): Promise<void> {
    if (!form.brand.trim()) return;
    await fetch('/api/franchise-brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requesterId: userId,
            companyName,
            brandName: form.brand,
            industry: form.industry,
            businessType: form.businessType,
            categoryMajor: form.categoryMajor,
            categoryMiddle: form.categoryMiddle,
            categorySmall: form.categorySmall,
            recommendedKeywords: form.competitionKeyword ? [form.competitionKeyword] : []
        })
    });
}

export async function saveFranchiseLocationRequest({
    userId,
    companyName,
    form,
    region
}: SaveFranchiseLocationParams): Promise<void> {
    const response = await fetch('/api/franchise-locations', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...form,
            requesterId: userId,
            companyName,
            region
        })
    });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
}

export async function deleteFranchiseLocationRequest({
    userId,
    locationId
}: DeleteFranchiseLocationParams): Promise<void> {
    const params = new URLSearchParams({ id: locationId, requesterId: userId });
    const response = await fetch(`/api/franchise-locations?${params.toString()}`, { method: 'DELETE' });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(readApiError(payload));
}

export async function scanLocationCompetitorsRequest({
    userId,
    locationId,
    query
}: ScanLocationCompetitorsParams): Promise<void> {
    const response = await fetch('/api/franchise-locations/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: userId, locationId, query, radius: 700 })
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(readApiError(payload));
}

export function getSelectedBrandKeyword(brand: FranchiseBrand): string {
    return brand.recommendedKeywords?.[0] || '';
}
