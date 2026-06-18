import { readFranchiseIntakePromotionRecords } from './franchise-intake-promotions';
import {
    findMatchingRequestPromotion,
    MATCHING_REQUEST_PROMOTIONS_KEY
} from './franchise-matching-request-promotion-links';

export type FranchiseAdminIntakeProfileRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly name: string | null;
    readonly email: string | null;
    readonly role: string | null;
    readonly status: string | null;
};

export type FranchiseAdminIntakePropertyRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly name: string | null;
    readonly status: string | null;
    readonly operation_type: string | null;
    readonly address: string | null;
    readonly created_at: string | null;
    readonly updated_at: string | null;
    readonly data: Record<string, unknown> | null;
};

export type FranchiseAdminIntakeLocationRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly source_property_id: string | null;
    readonly updated_at: string | null;
    readonly data: Record<string, unknown> | null;
};

export type FranchiseAdminIntakeMatchingRequestRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly name: string | null;
    readonly mobile: string | null;
    readonly source: string | null;
    readonly status: string | null;
    readonly grade: string | null;
    readonly desired_region: string | null;
    readonly interested_brand: string | null;
    readonly budget_min: number | null;
    readonly budget_max: number | null;
    readonly memo: string | null;
    readonly next_contact_at: string | null;
    readonly created_at: string | null;
    readonly updated_at: string | null;
    readonly data: Record<string, unknown> | null;
};

export function displayProfileName(profile: FranchiseAdminIntakeProfileRow): string {
    return profile.name || profile.email || '이름 없음';
}

function readDataString(data: Record<string, unknown> | null, key: string): string {
    const value = data?.[key];
    return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSnapshotUpdatedAt(data: Record<string, unknown> | null): string {
    const snapshot = data?.sourcePropertySnapshot;
    if (!isRecord(snapshot)) return '';
    const value = snapshot.updatedAt;
    return typeof value === 'string' ? value : '';
}

function isNewer(sourceAt: string | null, syncedAt: string): boolean {
    if (!sourceAt || !syncedAt) return false;
    const sourceTime = new Date(sourceAt).getTime();
    const syncedTime = new Date(syncedAt).getTime();
    return Number.isFinite(sourceTime) && Number.isFinite(syncedTime) && sourceTime > syncedTime;
}

function toPromotedCompanyNames(
    companyIds: readonly string[],
    companies: ReadonlyMap<string, string>
): readonly string[] {
    return companyIds.map(companyId => companies.get(companyId) || '회사명 없음');
}

export function toAdminIntakePropertyView(
    row: FranchiseAdminIntakePropertyRow,
    companies: ReadonlyMap<string, string>,
    locations: readonly FranchiseAdminIntakeLocationRow[],
    selectedCompanyId: string
) {
    const companyId = row.company_id || '';
    const selectedLocation = selectedCompanyId
        ? locations.find(location => location.company_id === selectedCompanyId)
        : locations[0];
    const promotedCompanyIds = [
        ...new Set(locations.map(location => location.company_id).filter((id): id is string => Boolean(id)))
    ];
    const syncedAt = readSnapshotUpdatedAt(selectedLocation?.data || null);
    return {
        id: row.id,
        companyId,
        companyName: companies.get(companyId) || '회사명 없음',
        managerId: row.manager_id || '',
        name: row.name || readDataString(row.data, 'name') || '이름 없는 물건',
        status: row.status || '',
        operationType: row.operation_type || '',
        address: row.address || '',
        region: readDataString(row.data, 'region'),
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
        promotedLocationId: selectedLocation?.id || '',
        promotedCompanyId: selectedLocation?.company_id || '',
        promotedCompanyIds,
        promotedCompanyNames: toPromotedCompanyNames(promotedCompanyIds, companies),
        promotionCount: promotedCompanyIds.length,
        syncStatus: selectedLocation && isNewer(row.updated_at, syncedAt) ? 'stale' : 'synced'
    };
}

export function toAdminMatchingRequestView(
    row: FranchiseAdminIntakeMatchingRequestRow,
    managerNames: ReadonlyMap<string, string>,
    companies: ReadonlyMap<string, string>,
    selectedCompanyId: string
) {
    const data = row.data || {};
    const promotions = readFranchiseIntakePromotionRecords(data, MATCHING_REQUEST_PROMOTIONS_KEY);
    const selectedPromotion = findMatchingRequestPromotion(data, selectedCompanyId || null);
    const promotedAt = selectedPromotion?.promotedAt || '';
    const promotedLeadId = selectedPromotion?.promotedLeadId || '';
    const promotedCompanyId = selectedPromotion?.targetCompanyId || '';
    const promotedCompanyIds = promotions.length > 0
        ? [...new Set(promotions.map(promotion => promotion.targetCompanyId).filter(Boolean))]
        : promotedCompanyId ? [promotedCompanyId] : [];
    return {
        id: row.id,
        companyId: row.company_id || '',
        managerId: row.manager_id || '',
        managerName: row.manager_id ? managerNames.get(row.manager_id) || '' : '',
        name: row.name || '이름 없음',
        mobile: row.mobile || '',
        email: readDataString(data, 'email'),
        residence: readDataString(data, 'residence'),
        currentJob: readDataString(data, 'currentJob'),
        desiredRegion: row.desired_region || '',
        desiredCategory: readDataString(data, 'desiredCategory'),
        interestedBrand: row.interested_brand || '',
        brandPreference: readDataString(data, 'brandPreference'),
        budgetMin: row.budget_min,
        budgetMax: row.budget_max,
        totalBudget: readDataString(data, 'totalBudget'),
        ownCapital: readDataString(data, 'ownCapital'),
        loanPreference: readDataString(data, 'loanPreference'),
        desiredDeposit: readDataString(data, 'desiredDeposit'),
        desiredRent: readDataString(data, 'desiredRent'),
        desiredPremium: readDataString(data, 'desiredPremium'),
        desiredSize: readDataString(data, 'desiredSize'),
        desiredFloor: readDataString(data, 'desiredFloor'),
        excludedRegion: readDataString(data, 'excludedRegion'),
        ownedPropertyStatus: readDataString(data, 'ownedPropertyStatus'),
        ownedPropertyName: readDataString(data, 'ownedPropertyName'),
        ownedPropertyAddress: readDataString(data, 'ownedPropertyAddress'),
        matchPriority: readDataString(data, 'matchPriority'),
        proposalRange: readDataString(data, 'proposalRange'),
        urgency: readDataString(data, 'urgency'),
        summaryNote: readDataString(data, 'summaryNote'),
        riskMemo: readDataString(data, 'riskMemo'),
        recommendedBrands: readDataString(data, 'recommendedBrands'),
        recommendedProperties: readDataString(data, 'recommendedProperties'),
        nextAction: readDataString(data, 'nextAction'),
        memo: row.memo || '',
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
        promotedLeadId,
        promotedCompanyId,
        promotedCompanyIds,
        promotedCompanyNames: toPromotedCompanyNames(promotedCompanyIds, companies),
        promotionCount: promotedCompanyIds.length,
        promotedAt,
        syncStatus: promotedAt && isNewer(row.updated_at, promotedAt) ? 'stale' : 'synced'
    };
}
