import { normalizeRegion } from '@/lib/franchise-market-insights';
import type { FranchiseLocation, LocationFormState } from './types';

export function isOperationalLocation(location: FranchiseLocation): boolean {
    return location.locationType === '직영점'
        || location.locationType === '가맹점'
        || ['운영중', '휴점', '폐점'].includes(location.status);
}

export function formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
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

export function getCompetitionKeyword(location: Pick<FranchiseLocation, 'brand' | 'competitionKeyword'>): string {
    return (location.competitionKeyword || location.brand || '').trim();
}

export function getLocationRegion(location: Pick<FranchiseLocation, 'region' | 'address'>): string {
    return location.region || normalizeRegion(location.address);
}

export function toLocationFormState(location: FranchiseLocation): LocationFormState {
    return {
        id: location.id,
        name: location.name || '',
        locationType: location.locationType || '가맹점',
        brand: location.brand || '',
        brandId: location.brandId || '',
        industry: location.industry || '',
        businessType: location.businessType || '',
        categoryMajor: location.categoryMajor || '',
        categoryMiddle: location.categoryMiddle || '',
        categorySmall: location.categorySmall || '',
        competitionKeyword: location.competitionKeyword || '',
        status: location.status || '운영중',
        region: location.region || normalizeRegion(location.address),
        address: location.address || '',
        latitude: location.latitude,
        longitude: location.longitude,
        openedAt: location.openedAt || '',
        memo: location.memo || ''
    };
}
