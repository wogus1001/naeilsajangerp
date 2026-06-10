import type { RealtyImportedListing, RealtyListingRecord } from './types';

export type RealtyMapPosition = {
    readonly lat: number;
    readonly lng: number;
};

export type RealtyMapCandidate = {
    readonly key: string;
    readonly title: string;
    readonly address: string;
    readonly sourceUrl: string;
    readonly storedPosition: RealtyMapPosition | null;
};

function cleanString(value: unknown): string {
    return String(value || '').trim();
}

function parseCoordinate(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAddressKey(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function getRealtyMapCandidateKey(listing: RealtyListingRecord, addressKey: string): string {
    return listing.id || `${listing.source}:${listing.sourceListingId || addressKey}`;
}

export function getRealtyListingPosition(listing?: RealtyListingRecord): RealtyMapPosition | null {
    const lat = parseCoordinate(listing?.latitude);
    const lng = parseCoordinate(listing?.longitude);
    if (lat === null || lng === null) return null;
    return { lat, lng };
}

export function getRealtyMapAddress(listing?: RealtyListingRecord): string {
    return cleanString(listing?.address || listing?.region || listing?.title);
}

export function getRealtyListingMapKey(listing?: RealtyListingRecord): string {
    const address = getRealtyMapAddress(listing);
    if (!listing || !address) return '';
    return getRealtyMapCandidateKey(listing, normalizeAddressKey(address));
}

export function buildRealtyMapCandidates(listings: readonly RealtyImportedListing[]): readonly RealtyMapCandidate[] {
    const seen = new Set<string>();
    const candidates: RealtyMapCandidate[] = [];

    listings.forEach(item => {
        const listing = item.listing;
        const address = getRealtyMapAddress(listing);
        if (!listing || !address) return;

        const addressKey = normalizeAddressKey(address);
        if (seen.has(addressKey)) return;
        seen.add(addressKey);
        candidates.push({
            key: getRealtyMapCandidateKey(listing, addressKey),
            title: cleanString(listing.title) || address,
            address,
            sourceUrl: cleanString(listing.sourceUrl),
            storedPosition: getRealtyListingPosition(listing)
        });
    });

    return candidates;
}

export function getInitialRealtyMapCenter(points: readonly RealtyMapPosition[]): RealtyMapPosition {
    if (points.length === 0) return { lat: 37.5665, lng: 126.9780 };
    const total = points.reduce(
        (acc, point) => ({
            lat: acc.lat + point.lat,
            lng: acc.lng + point.lng
        }),
        { lat: 0, lng: 0 }
    );
    return {
        lat: total.lat / points.length,
        lng: total.lng / points.length
    };
}
