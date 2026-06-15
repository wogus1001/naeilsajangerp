import type { RealtyImportedListing, RealtyListingRecord } from './types';

export type RealtyGroup = {
    readonly key: string;
    readonly listings: readonly RealtyImportedListing[];
    readonly favoriteCount: number;
};

export type RealtySavedRegion = {
    readonly key: string;
    readonly count: number;
    readonly favoriteCount: number;
};

const SIDO_ALIASES: Readonly<Record<string, string>> = {
    서울특별시: '서울',
    부산광역시: '부산',
    대구광역시: '대구',
    인천광역시: '인천',
    광주광역시: '광주',
    대전광역시: '대전',
    울산광역시: '울산',
    세종특별자치시: '세종',
    경기도: '경기',
    강원특별자치도: '강원',
    충청북도: '충북',
    충청남도: '충남',
    전북특별자치도: '전북',
    전라남도: '전남',
    경상북도: '경북',
    경상남도: '경남',
    제주특별자치도: '제주'
} as const;

export function formatRealtyMoney(listing?: RealtyListingRecord): string {
    if (!listing) return '-';
    const format = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '';
        return `${Number(value).toLocaleString()}만원`;
    };
    if (listing.salePrice) return `매매 ${format(listing.salePrice)}`;
    if (listing.depositAmount || listing.monthlyRent) {
        return `보증금 ${format(listing.depositAmount) || '0만원'} / 월세 ${format(listing.monthlyRent) || '0만원'}`;
    }
    return '-';
}

export function getRealtySourceLabel(source?: string): string {
    if (source === 'daangn') return '당근';
    return source || '-';
}

export function formatRealtyDate(value: unknown, options?: Intl.DateTimeFormatOptions): string {
    const dateValue = String(value || '').trim();
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString('ko-KR', options || {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

export function formatSavedAt(listing?: RealtyListingRecord): string {
    const value = listing?.createdAt || listing?.updatedAt || listing?.collectedAt;
    return formatRealtyDate(value, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }) || '-';
}

export function formatRealtyAreaAndFloor(listing?: RealtyListingRecord): string {
    if (!listing) return '-';
    const parts = [
        listing.areaPyeong || (listing.areaSqm ? `${listing.areaSqm}㎡` : ''),
        listing.floorInfo ? `${listing.floorInfo}층` : ''
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : '-';
}

export function summarizeRealtyContent(value: unknown): string {
    const text = String(value || '')
        .replace(/[^\S\r\n]+/g, ' ')
        .split('\n')
        .map(line => line.replace(/[^\w가-힣㎡.,/()~· -]/g, '').trim())
        .filter(Boolean)
        .find(line => !/매물번호|전화|010-|02-/.test(line));
    return text ? text.slice(0, 70) : '';
}

export function getRealtyDetailMeta(listing?: RealtyListingRecord): readonly string[] {
    const raw = listing?.raw || {};
    return [
        listing?.maintenanceFee === null || listing?.maintenanceFee === undefined
            ? '관리비 확인'
            : `관리비 ${Number(listing.maintenanceFee).toLocaleString()}만원`,
        raw.buildingApprovalDate ? `사용승인 ${formatRealtyDate(raw.buildingApprovalDate)}` : '',
        raw.createdAt ? `등록 ${formatRealtyDate(raw.createdAt)}` : '',
        raw.writerType === 'BROKER' ? '중개사' : raw.writerType === 'OWNER' ? '직거래' : ''
    ].filter(Boolean);
}

export function getRealtyReactionMeta(listing?: RealtyListingRecord): readonly string[] {
    const raw = listing?.raw || {};
    return [
        raw.chatRoomCount !== undefined ? `채팅 ${Number(raw.chatRoomCount).toLocaleString()}` : '',
        raw.watchCount !== undefined ? `관심 ${Number(raw.watchCount).toLocaleString()}` : ''
    ].filter(Boolean);
}

export function isFavorite(item: RealtyImportedListing): boolean {
    return item.listing?.data?.favorite === true;
}

function findLocalUnit(value: string): string {
    const tokens = value.split(/\s+/).filter(Boolean);
    return tokens.findLast(token => /^[가-힣0-9]+(?:동|가|읍|면|리)$/.test(token)) || '';
}

function findDistrictUnit(value: string): string {
    const tokens = value.split(/\s+/).filter(Boolean);
    return tokens.findLast(token => /^[가-힣0-9]+(?:구|군|시)$/.test(token)) || '';
}

function findSidoUnit(value: string): string {
    const tokens = value.split(/\s+/).filter(Boolean);
    const sido = tokens.find(token => /(?:특별시|광역시|특별자치시|특별자치도|도|서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)$/.test(token));
    if (!sido) return '';
    return SIDO_ALIASES[sido] || sido;
}

function getRealtyGroupKey(listing?: RealtyListingRecord): string {
    const region = listing?.region || '';
    const regionLocalUnit = findLocalUnit(region);
    if (regionLocalUnit) return regionLocalUnit;

    const regionDistrictUnit = findDistrictUnit(region);
    if (regionDistrictUnit) return regionDistrictUnit;

    return findLocalUnit(listing?.address || '') || findDistrictUnit(listing?.address || '') || '지역 미확인';
}

export function groupListings(listings: readonly RealtyImportedListing[]): readonly RealtyGroup[] {
    const groups = new Map<string, RealtyImportedListing[]>();
    listings.forEach(item => {
        const key = getRealtyGroupKey(item.listing);
        groups.set(key, [...(groups.get(key) || []), item]);
    });

    return Array.from(groups.entries())
        .map(([key, groupItems]) => ({
            key,
            listings: groupItems,
            favoriteCount: groupItems.filter(isFavorite).length
        }))
        .sort((a, b) => a.key.localeCompare(b.key, 'ko-KR'));
}

export function getRealtySavedRegionKeyFromText(value: string): string {
    const sido = findSidoUnit(value);
    const district = findDistrictUnit(value);
    if (sido && district) return `${sido} ${district}`;
    if (district) return district;
    return value.trim() || '지역 미확인';
}

export function getRealtySavedRegionKey(listing?: RealtyListingRecord): string {
    const regionKey = getRealtySavedRegionKeyFromText(listing?.region || '');
    if (regionKey !== '지역 미확인') return regionKey;
    return getRealtySavedRegionKeyFromText(listing?.address || '');
}

export function getSavedRegions(listings: readonly RealtyImportedListing[]): readonly RealtySavedRegion[] {
    const groups = new Map<string, RealtyImportedListing[]>();
    listings.forEach(item => {
        const key = getRealtySavedRegionKey(item.listing);
        groups.set(key, [...(groups.get(key) || []), item]);
    });

    return Array.from(groups.entries())
        .map(([key, groupItems]) => ({
            key,
            count: groupItems.length,
            favoriteCount: groupItems.filter(isFavorite).length
        }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, 'ko-KR'));
}

export function mergeFavorite(
    items: readonly RealtyImportedListing[],
    listingId: string,
    favorite: boolean
): readonly RealtyImportedListing[] {
    return items.map(item => {
        if (item.listing?.id !== listingId) return item;
        return {
            ...item,
            listing: {
                ...item.listing,
                data: {
                    ...(item.listing.data || {}),
                    favorite
                }
            }
        };
    });
}
