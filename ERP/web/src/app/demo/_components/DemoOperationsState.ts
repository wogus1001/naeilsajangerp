import type { KakaoAddressResult } from '@/components/franchise/KakaoAddressSearch';
import { isOperationalLocation } from '@/components/franchise/operations/format';
import type { FranchiseLocation, FranchiseLocationStatus, LocationFormState } from '@/components/franchise/operations/types';
import type { FranchiseBrand } from '@/lib/franchise-brands';
import { normalizeRegion } from '@/lib/franchise-market-insights';

export type SaveDemoOperationParams = {
    readonly locations: readonly FranchiseLocation[];
    readonly form: LocationFormState;
    readonly fallbackId: string;
    readonly timestamp: string;
};

export type SaveDemoOperationResult = {
    readonly locations: readonly FranchiseLocation[];
    readonly location: FranchiseLocation;
};

export type DemoOperationCounts = {
    readonly activeCount: number;
    readonly openingCount: number;
    readonly pausedCount: number;
};

function cleanText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

export function saveDemoOperationForm({
    locations,
    form,
    fallbackId,
    timestamp
}: SaveDemoOperationParams): SaveDemoOperationResult {
    const id = form.id || fallbackId;
    const existing = locations.find(location => location.id === id);
    const address = cleanText(form.address);
    const location: FranchiseLocation = {
        ...existing,
        id,
        companyId: existing?.companyId || 'demo-company',
        managerId: existing?.managerId || null,
        name: cleanText(form.name),
        locationType: form.locationType,
        brand: cleanText(form.brand),
        status: form.status,
        region: cleanText(form.region) || normalizeRegion(address),
        address,
        latitude: form.latitude,
        longitude: form.longitude,
        openedAt: form.openedAt || null,
        memo: form.memo.trim(),
        createdAt: existing?.createdAt || timestamp,
        updatedAt: timestamp,
        competitionKeyword: cleanText(form.competitionKeyword),
        brandId: form.brandId,
        industry: cleanText(form.industry),
        businessType: cleanText(form.businessType),
        categoryMajor: cleanText(form.categoryMajor),
        categoryMiddle: cleanText(form.categoryMiddle),
        categorySmall: cleanText(form.categorySmall)
    };
    const nextLocations = existing
        ? locations.map(item => item.id === id ? location : item)
        : [location, ...locations];
    return { locations: nextLocations, location };
}

export function updateDemoOperationStatus(
    locations: readonly FranchiseLocation[],
    locationId: string,
    status: FranchiseLocationStatus
): readonly FranchiseLocation[] {
    return locations.map(location => location.id === locationId ? { ...location, status } : location);
}

export function deleteDemoOperation(
    locations: readonly FranchiseLocation[],
    locationId: string
): readonly FranchiseLocation[] {
    return locations.filter(location => location.id !== locationId);
}

export function getDemoOperationCounts(locations: readonly FranchiseLocation[]): DemoOperationCounts {
    const operationalLocations = locations.filter(isOperationalLocation);
    return {
        activeCount: operationalLocations.filter(location => location.status === '운영중').length,
        openingCount: operationalLocations.filter(location => location.status === '오픈준비').length,
        pausedCount: operationalLocations.filter(location => location.status === '휴점').length
    };
}

export function applyDemoOperationAddress(
    form: LocationFormState,
    result: KakaoAddressResult
): LocationFormState {
    return {
        ...form,
        address: result.address,
        region: result.region || normalizeRegion(result.address),
        latitude: result.latitude,
        longitude: result.longitude
    };
}

export function applyDemoOperationBrand(
    form: LocationFormState,
    brand: FranchiseBrand
): LocationFormState {
    return {
        ...form,
        brand: brand.brandName,
        brandId: brand.id.startsWith('custom-') ? '' : brand.id,
        industry: brand.industry || '',
        businessType: brand.businessType || '',
        categoryMajor: brand.categoryMajor || '',
        categoryMiddle: brand.categoryMiddle || '',
        categorySmall: brand.categorySmall || '',
        competitionKeyword: brand.recommendedKeywords[0] || form.competitionKeyword
    };
}
