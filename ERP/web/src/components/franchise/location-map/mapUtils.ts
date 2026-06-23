import {
    FRANCHISE_LOCATION_STATUSES,
    type FranchiseLocation,
    type FranchiseLocationStatus
} from '@/components/franchise/operations/types';
import type {
    LocationMapCounts,
    LocationMapFilters,
    LocationMapKind,
    LocationMapMode,
    LocationMapPoint,
    LocationMapPosition
} from './types';

const DEFAULT_CENTER: LocationMapPosition = { lat: 37.5665, lng: 126.9780 };
const KOREA_LATITUDE_RANGE = { min: 32, max: 39.5 };
const KOREA_LONGITUDE_RANGE = { min: 123, max: 132.5 };

export const LOCATION_MAP_STATUS_COLORS: Readonly<Record<FranchiseLocationStatus, string>> = {
    운영중: '#03b26c',
    오픈준비: '#3182f6',
    검토중: '#fe9800',
    휴점: '#8b95a1',
    폐점: '#f04452'
};

export const LOCATION_MAP_MODE_LABELS: Readonly<Record<LocationMapMode, string>> = {
    all: '전체',
    operations: '가맹 운영점',
    candidates: '출점 후보지'
};

export const EMPTY_LOCATION_MAP_FILTERS: LocationMapFilters = {
    mode: 'all',
    query: '',
    statuses: new Set(FRANCHISE_LOCATION_STATUSES)
};

export function getLocationMapKind(location: FranchiseLocation): LocationMapKind {
    if (location.locationType === '직영점' || location.locationType === '가맹점') return 'operation';
    return 'candidate';
}

export function isLocationVisibleByMode(location: FranchiseLocation, mode: LocationMapMode): boolean {
    const kind = getLocationMapKind(location);
    if (mode === 'operations') return kind === 'operation';
    if (mode === 'candidates') return kind === 'candidate';
    return true;
}

export function filterLocationMapItems(
    locations: readonly FranchiseLocation[],
    filters: LocationMapFilters
): readonly FranchiseLocation[] {
    const query = filters.query.trim().toLowerCase();
    return locations.filter(location => {
        if (!isLocationVisibleByMode(location, filters.mode)) return false;
        if (!filters.statuses.has(location.status)) return false;
        if (!query) return true;

        const haystack = [
            location.name,
            location.brand,
            location.status,
            location.locationType,
            location.region,
            location.address,
            location.memo
        ].join(' ').toLowerCase();
        return haystack.includes(query);
    });
}

export function buildLocationMapCounts(
    allLocations: readonly FranchiseLocation[],
    visibleLocations: readonly FranchiseLocation[],
    points: readonly LocationMapPoint[]
): LocationMapCounts {
    const mappableIds = new Set(points.map(point => point.location.id));
    return {
        total: allLocations.length,
        operation: allLocations.filter(location => getLocationMapKind(location) === 'operation').length,
        candidate: allLocations.filter(location => getLocationMapKind(location) === 'candidate').length,
        visible: visibleLocations.length,
        mappable: points.length,
        unmapped: visibleLocations.filter(location => !mappableIds.has(location.id)).length
    };
}

export function getStoredPosition(location: FranchiseLocation): LocationMapPosition | null {
    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (isKoreaPosition(lat, lng)) return { lat, lng };
    if (isKoreaPosition(lng, lat)) return { lat: lng, lng: lat };
    return null;
}

function isKoreaPosition(lat: number, lng: number): boolean {
    return isInRange(lat, KOREA_LATITUDE_RANGE) && isInRange(lng, KOREA_LONGITUDE_RANGE);
}

function isInRange(value: number, range: { readonly min: number; readonly max: number }): boolean {
    return value >= range.min && value <= range.max;
}

export function getLocationMapCenter(points: readonly LocationMapPoint[]): LocationMapPosition {
    if (points.length === 0) return DEFAULT_CENTER;
    const first = points[0];
    if (points.length === 1 || !first) return first?.position || DEFAULT_CENTER;

    const total = points.reduce(
        (acc, point) => ({ lat: acc.lat + point.position.lat, lng: acc.lng + point.position.lng }),
        { lat: 0, lng: 0 }
    );
    return {
        lat: total.lat / points.length,
        lng: total.lng / points.length
    };
}

export function getLocationMapLevel(points: readonly LocationMapPoint[]): number {
    if (points.length <= 1) return 5;
    const positions = points.map(point => point.position);
    const latValues = positions.map(position => position.lat);
    const lngValues = positions.map(position => position.lng);
    const latSpread = Math.max(...latValues) - Math.min(...latValues);
    const lngSpread = Math.max(...lngValues) - Math.min(...lngValues);
    const spread = Math.max(latSpread, lngSpread);

    if (spread > 4) return 13;
    if (spread > 2) return 12;
    if (spread > 1) return 11;
    if (spread > 0.45) return 10;
    if (spread > 0.2) return 9;
    if (spread > 0.08) return 8;
    if (spread > 0.03) return 7;
    return 6;
}

export function buildLocationMapLink(location: FranchiseLocation): string {
    if (getLocationMapKind(location) === 'operation') {
        return `/dashboard/franchise-operations?locationId=${encodeURIComponent(location.id)}`;
    }
    return `/dashboard/franchise-leads/market-insights?locationId=${encodeURIComponent(location.id)}`;
}

export function formatLocationMapDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function toggleLocationMapStatus(
    statuses: ReadonlySet<FranchiseLocationStatus>,
    status: FranchiseLocationStatus
): ReadonlySet<FranchiseLocationStatus> {
    const next = new Set(statuses);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    return next.size === 0 ? new Set(FRANCHISE_LOCATION_STATUSES) : next;
}
