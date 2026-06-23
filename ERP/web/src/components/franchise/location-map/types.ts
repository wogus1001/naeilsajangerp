import type {
    FranchiseLocation,
    FranchiseLocationStatus
} from '@/components/franchise/operations/types';

export const LOCATION_MAP_MODES = ['all', 'operations', 'candidates'] as const;

export type LocationMapMode = typeof LOCATION_MAP_MODES[number];

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
