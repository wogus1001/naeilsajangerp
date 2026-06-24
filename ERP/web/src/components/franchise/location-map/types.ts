import type {
    FranchiseLocation,
    FranchiseLocationStatus
} from '@/components/franchise/operations/types';

export const LOCATION_MAP_MODES = ['all', 'operations', 'candidates'] as const;
export const LOCATION_MAP_RADIUS_OPTIONS = [500, 1000, 2000] as const;
export const LOCATION_MAP_RADIUS_BASE_MODES = ['selected', 'manual'] as const;
export const LOCATION_MAP_MEASUREMENT_MODES = ['none', 'distance', 'area'] as const;

export type LocationMapMode = typeof LOCATION_MAP_MODES[number];
export type LocationMapRadiusMeters = typeof LOCATION_MAP_RADIUS_OPTIONS[number];
export type LocationMapRadiusBaseMode = typeof LOCATION_MAP_RADIUS_BASE_MODES[number];
export type LocationMapMeasurementMode = typeof LOCATION_MAP_MEASUREMENT_MODES[number];

export type LocationMapKind = 'operation' | 'candidate';

export type LocationMapPosition = {
    readonly lat: number;
    readonly lng: number;
};

export type LocationMapPoint = {
    readonly location: FranchiseLocation;
    readonly kind: LocationMapKind;
    readonly position: LocationMapPosition;
    readonly source: 'stored' | 'geocoded';
};

export type LocationMapFilters = {
    readonly mode: LocationMapMode;
    readonly query: string;
    readonly statuses: ReadonlySet<FranchiseLocationStatus>;
};

export type LocationMapCounts = {
    readonly total: number;
    readonly operation: number;
    readonly candidate: number;
    readonly visible: number;
    readonly mappable: number;
    readonly unmapped: number;
};

export type LocationRadiusNearbyPoint = {
    readonly point: LocationMapPoint;
    readonly distanceMeters: number;
};

export type LocationRadiusAnalysis = {
    readonly radiusMeters: LocationMapRadiusMeters;
    readonly nearbyPoints: readonly LocationRadiusNearbyPoint[];
    readonly operationCount: number;
    readonly candidateCount: number;
    readonly statusCounts: Readonly<Record<FranchiseLocationStatus, number>>;
};
