import { normalizeRegion } from './franchise-market-insights';

export type ManualPromotedOperationProperty = {
    readonly id: string;
    readonly name?: string | null;
    readonly address?: string | null;
    readonly region?: string | null;
    readonly externalImportMode?: string | null;
    readonly externalSourceUrl?: string | null;
    readonly deposit?: number | string | null;
    readonly monthlyRent?: number | string | null;
    readonly area?: string | number | null;
    readonly floor?: string | number | null;
    readonly coordinates?: unknown;
};

export type ManualPromotedSourceLocation = {
    readonly id: string;
    readonly name: string;
    readonly status?: string | null;
    readonly sourcePropertyId?: string | null;
};

export type ManualPromotedLocationDraft = {
    readonly sourcePropertyId: string;
    readonly name: string;
    readonly locationType: '가맹점';
    readonly status: '오픈준비';
    readonly brand: '';
    readonly region: string;
    readonly address: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly memo: string;
};

export type ManualPromotedOperationEntry =
    | {
        readonly kind: 'ready';
        readonly property: ManualPromotedOperationProperty;
        readonly location: null;
    }
    | {
        readonly kind: 'linked';
        readonly property: ManualPromotedOperationProperty;
        readonly location: ManualPromotedSourceLocation;
    };

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCoordinate(value: unknown, key: 'lat' | 'lng'): number | null {
    if (!isRecord(value)) return null;
    const coordinate = value[key];
    return typeof coordinate === 'number' && Number.isFinite(coordinate) ? coordinate : null;
}

function displayName(property: ManualPromotedOperationProperty): string {
    const name = String(property.name || '').trim();
    return name || '외부 승격 물건지';
}

export function isManualPromotedOperationProperty(property: ManualPromotedOperationProperty): boolean {
    return property.externalImportMode === 'manual-promoted';
}

export function buildManualPromotedLocationDraft(
    property: ManualPromotedOperationProperty
): ManualPromotedLocationDraft {
    const address = String(property.address || '').trim();
    const region = String(property.region || '').trim() || normalizeRegion(address);

    return {
        sourcePropertyId: property.id,
        name: displayName(property),
        locationType: '가맹점',
        status: '오픈준비',
        brand: '',
        region,
        address,
        latitude: readCoordinate(property.coordinates, 'lat'),
        longitude: readCoordinate(property.coordinates, 'lng'),
        memo: '외부 상가 수동 승격 물건지에서 운영 전환 후보로 등록'
    };
}

export function buildManualPromotedOperationEntries(
    properties: readonly ManualPromotedOperationProperty[],
    locations: readonly ManualPromotedSourceLocation[]
): readonly ManualPromotedOperationEntry[] {
    const locationsBySourcePropertyId = new Map(
        locations
            .filter(location => Boolean(location.sourcePropertyId))
            .map(location => [String(location.sourcePropertyId), location])
    );

    return properties
        .filter(isManualPromotedOperationProperty)
        .map(property => {
            const location = locationsBySourcePropertyId.get(property.id);
            if (!location) {
                return { kind: 'ready', property, location: null };
            }
            return { kind: 'linked', property, location };
        });
}
