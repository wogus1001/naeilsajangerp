import type { RealtyImportedListing, RealtyListingRecord } from './types';
import { isFavorite } from './utils';

export const REALTY_SORT_OPTIONS = [
    { key: 'score_desc', label: '추천점수순' },
    { key: 'saved_desc', label: '최근 저장순' },
    { key: 'rent_asc', label: '월세 낮은순' },
    { key: 'area_desc', label: '면적 큰순' },
    { key: 'reaction_desc', label: '관심 많은순' }
] as const;

export type RealtySortKey = typeof REALTY_SORT_OPTIONS[number]['key'];

export type RealtyFilterState = {
    readonly favoriteOnly: boolean;
    readonly groundFloorOnly: boolean;
    readonly clearMaintenanceOnly: boolean;
    readonly sortKey: RealtySortKey;
};

export type RealtyListingScore = {
    readonly score: number;
    readonly reasons: readonly string[];
};

const SCORE_CAP = 100;

function getNumericRawValue(listing: RealtyListingRecord | undefined, key: string): number {
    const value = listing?.raw?.[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value.replace(/,/g, '')) || 0;
    return 0;
}

function getSavedTime(item: RealtyImportedListing): number {
    const value = item.listing?.createdAt || item.listing?.updatedAt || item.listing?.collectedAt || '';
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function getMonthlyRent(item: RealtyImportedListing): number {
    return item.listing?.monthlyRent ?? Number.MAX_SAFE_INTEGER;
}

function getArea(item: RealtyImportedListing): number {
    const rawArea = item.listing?.areaSqm;
    if (rawArea !== null && rawArea !== undefined) return rawArea;
    return Number(String(item.listing?.areaPyeong || '').replace(/[^\d.]/g, '')) || 0;
}

function getReactionScore(item: RealtyImportedListing): number {
    return getNumericRawValue(item.listing, 'watchCount') + getNumericRawValue(item.listing, 'chatRoomCount') * 3;
}

export function hasClearMaintenanceFee(listing?: RealtyListingRecord): boolean {
    return listing?.maintenanceFee !== null && listing?.maintenanceFee !== undefined;
}

export function isGroundFloor(listing?: RealtyListingRecord): boolean {
    return Number.parseFloat(String(listing?.floorInfo || '')) === 1;
}

export function scoreRealtyListing(item: RealtyImportedListing): RealtyListingScore {
    const listing = item.listing;
    const reasons: string[] = [];
    let score = 0;

    if (isFavorite(item)) {
        score += 15;
        reasons.push('별표');
    }
    if (isGroundFloor(listing)) {
        score += 25;
        reasons.push('1층');
    }
    if (listing?.monthlyRent || listing?.depositAmount || listing?.salePrice) {
        score += 15;
        reasons.push('가격');
    }
    if (getArea(item) > 0) {
        score += 12;
        reasons.push('면적');
    }
    if (hasClearMaintenanceFee(listing)) {
        score += 10;
        reasons.push('관리비');
    }
    if (listing?.address && listing.region) {
        score += 10;
        reasons.push('주소');
    }

    score += Math.min(13, getReactionScore(item));
    return {
        score: Math.min(SCORE_CAP, score),
        reasons
    };
}

export function filterRealtyListings(
    listings: readonly RealtyImportedListing[],
    filters: RealtyFilterState
): readonly RealtyImportedListing[] {
    return listings.filter(item => {
        if (filters.favoriteOnly && !isFavorite(item)) return false;
        if (filters.groundFloorOnly && !isGroundFloor(item.listing)) return false;
        if (filters.clearMaintenanceOnly && !hasClearMaintenanceFee(item.listing)) return false;
        return true;
    });
}

export function sortRealtyListings(
    listings: readonly RealtyImportedListing[],
    sortKey: RealtySortKey
): readonly RealtyImportedListing[] {
    return [...listings].sort((a, b) => {
        if (sortKey === 'score_desc') return scoreRealtyListing(b).score - scoreRealtyListing(a).score;
        if (sortKey === 'saved_desc') return getSavedTime(b) - getSavedTime(a);
        if (sortKey === 'rent_asc') return getMonthlyRent(a) - getMonthlyRent(b);
        if (sortKey === 'area_desc') return getArea(b) - getArea(a);
        return getReactionScore(b) - getReactionScore(a);
    });
}
