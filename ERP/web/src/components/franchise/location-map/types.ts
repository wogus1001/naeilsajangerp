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
export type LocationMapRuntime = 'live' | 'offline';

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

export type FranchiseLocationMapWorkspaceProps = {
    readonly companyName: string;
    readonly counts: LocationMapCounts;
    readonly filters: LocationMapFilters;
    readonly center: LocationMapPosition;
    readonly activePoint: LocationMapPoint | null;
    readonly activeLocationId: string;
    readonly comparisonRadiusPoints: readonly LocationMapPoint[];
    readonly focusRequestId: number;
    readonly focusedPoint: LocationMapPoint | null;
    readonly errorMessage: string;
    readonly isBusy: boolean;
    readonly isManualRadius: boolean;
    readonly isRadiusPicking: boolean;
    readonly measurementMode: LocationMapMeasurementMode;
    readonly measurementPoints: readonly LocationMapPosition[];
    readonly mapRuntime?: LocationMapRuntime;
    readonly points: readonly LocationMapPoint[];
    readonly radiusAnalysis: LocationRadiusAnalysis;
    readonly radiusBaseMode: LocationMapRadiusBaseMode;
    readonly radiusCenter: LocationMapPosition | null;
    readonly radiusMeters: LocationMapRadiusMeters;
    readonly measurementDistanceMeters: number;
    readonly measurementAreaSquareMeters: number;
    readonly onKakaoReadyChange: (ready: boolean) => void;
    readonly onMeasurementPointAdd: (position: LocationMapPosition) => void;
    readonly onMeasurementClear: () => void;
    readonly onMeasurementModeChange: (mode: LocationMapMeasurementMode) => void;
    readonly onMeasurementUndo: () => void;
    readonly onModeChange: (mode: LocationMapMode) => void;
    readonly onQueryChange: (query: string) => void;
    readonly onRadiusCenterPick: (position: LocationMapPosition) => void;
    readonly onRadiusChange: (radiusMeters: LocationMapRadiusMeters) => void;
    readonly onSelectAllStatuses: () => void;
    readonly onSelectPoint: (locationId: string) => void;
    readonly onStartRadiusPicking: () => void;
    readonly onToggleStatus: (status: FranchiseLocationStatus) => void;
    readonly onUseSelectedRadius: () => void;
};
