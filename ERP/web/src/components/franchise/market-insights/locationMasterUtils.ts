import {
    EMPTY_LOCATION_MASTER_DATA,
    getAcquisitionCostTotal,
    normalizeFranchiseLocationMasterData,
    parseLocationMoney,
    toLocationDevelopmentStage,
    toLocationImportanceLevel
} from '@/lib/franchise-location-master';
import { normalizeRegion } from '@/lib/franchise-market-insights';
import type {
    FranchiseLocation,
    FranchiseLocationStatus,
    FranchiseLocationType,
    LocationFormState,
    LocationMasterFilters
} from './locationMasterTypes';
import {
    FRANCHISE_LOCATION_STATUSES,
    FRANCHISE_LOCATION_TYPES
} from './locationMasterTypes';

export const EMPTY_LOCATION_FILTERS: LocationMasterFilters = {
    region: '',
    maxAcquisitionCost: '',
    maxDeposit: '',
    maxPremium: '',
    maxMonthlyRent: '',
    maxMaintenanceFee: '',
    importance: '',
    status: '',
    developmentStage: ''
};

export const EMPTY_LOCATION_FORM: LocationFormState = {
    name: '',
    managerId: '',
    locationType: '예정점',
    brand: '',
    brandId: '',
    industry: '',
    businessType: '',
    categoryMajor: '',
    categoryMiddle: '',
    categorySmall: '',
    competitionKeyword: '',
    status: '검토중',
    region: '',
    address: '',
    addressDetail: '',
    latitude: null,
    longitude: null,
    openedAt: '',
    memo: '',
    ...EMPTY_LOCATION_MASTER_DATA
};

export function toFranchiseLocationType(value: string): FranchiseLocationType {
    return FRANCHISE_LOCATION_TYPES.find(type => type === value) || '예정점';
}

export function toFranchiseLocationStatus(value: string): FranchiseLocationStatus {
    return FRANCHISE_LOCATION_STATUSES.find(status => status === value) || '검토중';
}

export function toLocationFormState(location: FranchiseLocation): LocationFormState {
    const masterData = normalizeFranchiseLocationMasterData(location);
    return {
        id: location.id,
        managerId: location.managerId || '',
        name: location.name || '',
        locationType: location.locationType || '예정점',
        brand: location.brand || '',
        brandId: location.brandId || '',
        industry: location.industry || '',
        businessType: location.businessType || '',
        categoryMajor: location.categoryMajor || '',
        categoryMiddle: location.categoryMiddle || '',
        categorySmall: location.categorySmall || '',
        competitionKeyword: location.competitionKeyword || '',
        status: location.status || '검토중',
        region: location.region || normalizeRegion(location.address),
        address: location.address || '',
        addressDetail: location.addressDetail || '',
        latitude: location.latitude,
        longitude: location.longitude,
        openedAt: location.openedAt || '',
        memo: location.memo || '',
        ...masterData
    };
}

export function getCompetitionKeyword(location: Pick<FranchiseLocation, 'brand' | 'competitionKeyword'>): string {
    return (location.competitionKeyword || location.brand || '').trim();
}

export function isSitePlanningLocation(location: FranchiseLocation): boolean {
    return location.locationType === '예정점' || location.status === '검토중' || location.status === '오픈준비';
}

function isBelowFilter(value: number | null, filterValue: string): boolean {
    const limit = parseLocationMoney(filterValue);
    if (limit === null) return true;
    if (value === null) return false;
    return value <= limit;
}

export function filterLocationMasterItems(
    locations: readonly FranchiseLocation[],
    filters: LocationMasterFilters
): readonly FranchiseLocation[] {
    const regionNeedle = filters.region.replace(/\s+/g, ' ').trim();
    return locations.filter(location => {
        const data = normalizeFranchiseLocationMasterData(location);
        const regionSource = `${location.region} ${location.address}`;
        const acquisitionCost = getAcquisitionCostTotal(data.cost);
        return (
            (!regionNeedle || regionSource.includes(regionNeedle)) &&
            (!filters.importance || data.importance === toLocationImportanceLevel(filters.importance)) &&
            (!filters.status || location.status === toFranchiseLocationStatus(filters.status)) &&
            (!filters.developmentStage || data.developmentStage === toLocationDevelopmentStage(filters.developmentStage)) &&
            isBelowFilter(acquisitionCost, filters.maxAcquisitionCost) &&
            isBelowFilter(data.cost.deposit, filters.maxDeposit) &&
            isBelowFilter(data.cost.premium, filters.maxPremium) &&
            isBelowFilter(data.lease.monthlyRent, filters.maxMonthlyRent) &&
            isBelowFilter(data.lease.maintenanceFee, filters.maxMaintenanceFee)
        );
    });
}

export function formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
}

export function formatScanDate(value?: string): string {
    if (!value) return '미수집';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
