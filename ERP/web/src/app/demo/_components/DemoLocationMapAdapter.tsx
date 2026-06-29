'use client';

import React from 'react';
import { MapPin, MousePointer2 } from 'lucide-react';
import { FranchiseLocationMapFilters } from '@/components/franchise/location-map/FranchiseLocationMapFilters';
import { FranchiseLocationMapPanel } from '@/components/franchise/location-map/FranchiseLocationMapPanel';
import mapStyles from '@/components/franchise/location-map/FranchiseLocationMapService.module.css';
import {
    EMPTY_LOCATION_MAP_FILTERS,
    buildLocationMapCounts,
    buildRadiusAnalysis,
    filterLocationMapItems,
    getLocationMapKind,
    getLocationPathDistanceMeters,
    getLocationPolygonAreaSquareMeters,
    getStoredPosition,
    toggleLocationMapStatus
} from '@/components/franchise/location-map/mapUtils';
import type {
    LocationMapFilters,
    LocationMapMeasurementMode,
    LocationMapPoint,
    LocationMapPosition,
    LocationMapRadiusBaseMode,
    LocationMapRadiusMeters
} from '@/components/franchise/location-map/types';
import {
    FRANCHISE_LOCATION_STATUSES,
    type FranchiseLocation,
    type FranchiseLocationStatus
} from '@/components/franchise/operations/types';
import type { DemoActionHandler, DemoScreenId } from '../demoTypes';
import {
    DEMO_LOCATION_MASTER_ITEMS,
    DEMO_OPERATION_LOCATIONS
} from './DemoFranchiseSampleData';
import { DemoGuideTarget, DemoScreenGuide } from './DemoScreenGuide';
import styles from './DemoLocationMapAdapter.module.css';

type DemoLocationMapAdapterProps = {
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

type DemoMarkerLayout = {
    readonly x: number;
    readonly y: number;
};

const DEMO_MAP_LOCATIONS: readonly FranchiseLocation[] = [
    ...DEMO_OPERATION_LOCATIONS,
    ...DEMO_LOCATION_MASTER_ITEMS
];

const DEMO_MAP_BOUNDS = {
    minLat: 33.2,
    maxLat: 37.8,
    minLng: 126.2,
    maxLng: 129.4
} as const;

const DEMO_MEASUREMENT_POINTS: readonly LocationMapPosition[] = [
    { lat: 37.4982, lng: 127.0281 },
    { lat: 37.5116, lng: 127.1008 },
    { lat: 37.5539, lng: 126.9187 },
    { lat: 37.5574, lng: 126.9236 }
];

export function DemoLocationMapAdapter({ onScreenChange, onSimulate }: DemoLocationMapAdapterProps) {
    const [filters, setFilters] = React.useState<LocationMapFilters>(() => ({
        ...EMPTY_LOCATION_MAP_FILTERS,
        statuses: new Set(EMPTY_LOCATION_MAP_FILTERS.statuses)
    }));
    const [activeLocationId, setActiveLocationId] = React.useState(DEMO_MAP_LOCATIONS[0]?.id || '');
    const [radiusMeters, setRadiusMeters] = React.useState<LocationMapRadiusMeters>(1000);
    const [radiusBaseMode, setRadiusBaseMode] = React.useState<LocationMapRadiusBaseMode>('selected');
    const [measurementMode, setMeasurementMode] = React.useState<LocationMapMeasurementMode>('none');
    const [measurementPoints, setMeasurementPoints] = React.useState<readonly LocationMapPosition[]>([]);
    const visibleLocations = React.useMemo(
        () => filterLocationMapItems(DEMO_MAP_LOCATIONS, filters),
        [filters]
    );
    const points = React.useMemo(
        () => visibleLocations.flatMap(location => {
            const point = toDemoMapPoint(location);
            return point ? [point] : [];
        }),
        [visibleLocations]
    );
    const activePoint = points.find(point => point.location.id === activeLocationId) || points[0] || null;
    const counts = React.useMemo(
        () => buildLocationMapCounts(DEMO_MAP_LOCATIONS, visibleLocations, points),
        [visibleLocations, points]
    );
    const radiusAnalysis = React.useMemo(
        () => buildRadiusAnalysis(activePoint, points, radiusMeters),
        [activePoint, points, radiusMeters]
    );
    const measurementDistanceMeters = React.useMemo(
        () => getLocationPathDistanceMeters(measurementPoints),
        [measurementPoints]
    );
    const measurementAreaSquareMeters = React.useMemo(
        () => getLocationPolygonAreaSquareMeters(measurementPoints),
        [measurementPoints]
    );

    React.useEffect(() => {
        if (!activePoint) {
            setActiveLocationId('');
            return;
        }
        if (activePoint.location.id !== activeLocationId) {
            setActiveLocationId(activePoint.location.id);
        }
    }, [activeLocationId, activePoint]);

    const selectPoint = (locationId: string) => {
        const selectedPoint = points.find(point => point.location.id === locationId);
        setActiveLocationId(locationId);
        if (selectedPoint) onSimulate(`${selectedPoint.location.name} 지도 선택`);
    };
    const updateMode = (mode: LocationMapFilters['mode']) => {
        setFilters(current => ({ ...current, mode }));
    };
    const toggleStatus = (status: FranchiseLocationStatus) => {
        setFilters(current => ({ ...current, statuses: toggleLocationMapStatus(current.statuses, status) }));
    };
    const selectAllStatuses = () => {
        setFilters(current => ({ ...current, statuses: new Set(FRANCHISE_LOCATION_STATUSES) }));
    };
    const changeMeasurementMode = (mode: LocationMapMeasurementMode) => {
        setMeasurementMode(mode);
        setRadiusBaseMode('selected');
        setMeasurementPoints(mode === 'none' ? [] : DEMO_MEASUREMENT_POINTS.slice(0, mode === 'area' ? 4 : 3));
        onSimulate(mode === 'none' ? '샘플 반경분석 보기' : `샘플 ${mode === 'distance' ? '거리재기' : '면적재기'} 보기`);
    };
    const clearMeasurement = () => {
        setMeasurementMode('none');
        setMeasurementPoints([]);
    };

    return (
        <div className={mapStyles.pageShell} data-demo-id="location-map-page">
            <DemoGuideTarget marker={1} targetId="location-map-filters" label="대상 전환">
                <FranchiseLocationMapFilters
                    companyName="내일"
                    counts={counts}
                    filters={filters}
                    onModeChange={updateMode}
                    onQueryChange={query => setFilters(current => ({ ...current, query }))}
                    onSelectAllStatuses={selectAllStatuses}
                    onToggleStatus={toggleStatus}
                />
            </DemoGuideTarget>
            <div className={styles.mapGuideStack}>
                <section className={styles.mapWorkspace}>
                    <DemoGuideTarget marker={2} targetId="location-map-canvas" label="마커 선택" className={styles.mapCanvasTarget}>
                        <div className={mapStyles.mapCanvas} aria-label="데모 물건지 지도">
                            <div className={styles.staticMapCanvas}>
                                <div className={styles.waterway} />
                                <div className={styles.roadPrimary} />
                                <div className={styles.roadSecondary} />
                                {activePoint ? <RadiusPreview activePoint={activePoint} radiusMeters={radiusMeters} /> : null}
                                {measurementMode !== 'none' ? (
                                    <div className={measurementMode === 'area' ? styles.measureAreaPreview : styles.measureLinePreview} />
                                ) : null}
                                {points.map((point, index) => (
                                    <MapMarker
                                        key={point.location.id}
                                        index={index + 1}
                                        isActive={activePoint?.location.id === point.location.id}
                                        point={point}
                                        onSelect={selectPoint}
                                    />
                                ))}
                                <div className={styles.mapHint}>
                                    <MousePointer2 size={15} />
                                    목록이나 마커를 선택하면 기준 물건지가 바뀝니다.
                                </div>
                                <div className={styles.mapScale}>데모 지도 · Kakao UI 흐름 미리보기</div>
                            </div>
                        </div>
                    </DemoGuideTarget>
                    <DemoGuideTarget marker={3} targetId="location-map-panel" label="지도 분석" className={styles.mapPanelTarget}>
                        <FranchiseLocationMapPanel
                            activePoint={activePoint}
                            counts={counts}
                            measurementAreaSquareMeters={measurementAreaSquareMeters}
                            measurementDistanceMeters={measurementDistanceMeters}
                            measurementMode={measurementMode}
                            measurementPoints={measurementPoints}
                            points={points}
                            radiusAnalysis={radiusAnalysis}
                            radiusBaseMode={radiusBaseMode}
                            radiusMeters={radiusMeters}
                            isRadiusPicking={false}
                            onMeasurementClear={clearMeasurement}
                            onMeasurementModeChange={changeMeasurementMode}
                            onMeasurementUndo={() => setMeasurementPoints(current => current.slice(0, -1))}
                            onRadiusChange={setRadiusMeters}
                            onStartRadiusPicking={() => {
                                setRadiusBaseMode('manual');
                                onSimulate('샘플 직접 반경 그리기');
                            }}
                            onUseSelectedRadius={() => {
                                setRadiusBaseMode('selected');
                                clearMeasurement();
                            }}
                            onSelectPoint={selectPoint}
                        />
                    </DemoGuideTarget>
                </section>
                <DemoScreenGuide screen="locationMap" onScreenChange={onScreenChange} />
            </div>
        </div>
    );
}

function RadiusPreview({ activePoint, radiusMeters }: { readonly activePoint: LocationMapPoint; readonly radiusMeters: LocationMapRadiusMeters }) {
    const layout = getMarkerLayout(activePoint.position);
    const diameter = radiusMeters === 500 ? 150 : radiusMeters === 1000 ? 250 : 360;

    return (
        <div
            className={styles.radiusPreview}
            style={{
                width: diameter,
                height: diameter,
                left: `${layout.x}%`,
                top: `${layout.y}%`
            }}
        />
    );
}

function MapMarker({
    index,
    isActive,
    point,
    onSelect
}: {
    readonly index: number;
    readonly isActive: boolean;
    readonly point: LocationMapPoint;
    readonly onSelect: (locationId: string) => void;
}) {
    const layout = getMarkerLayout(point.position);
    const markerClassName = [
        point.kind === 'operation' ? styles.operationMarker : styles.candidateMarker,
        isActive ? styles.markerActive : ''
    ].filter(Boolean).join(' ');

    return (
        <button
            type="button"
            className={markerClassName}
            style={{ left: `${layout.x}%`, top: `${layout.y}%` }}
            onClick={() => onSelect(point.location.id)}
            aria-label={`${point.location.name} 지도 선택`}
        >
            <span>{index}</span>
            <MapPin size={14} aria-hidden="true" />
            <strong>{point.location.name}</strong>
        </button>
    );
}

function toDemoMapPoint(location: FranchiseLocation): LocationMapPoint | null {
    const position = getStoredPosition(location);
    if (!position) return null;
    return {
        location,
        kind: getLocationMapKind(location),
        position,
        source: 'stored'
    };
}

function getMarkerLayout(position: LocationMapPosition): DemoMarkerLayout {
    const longitudeRatio = normalizeToRatio(position.lng, DEMO_MAP_BOUNDS.minLng, DEMO_MAP_BOUNDS.maxLng);
    const latitudeRatio = normalizeToRatio(DEMO_MAP_BOUNDS.maxLat - position.lat, 0, DEMO_MAP_BOUNDS.maxLat - DEMO_MAP_BOUNDS.minLat);
    return {
        x: 10 + longitudeRatio * 80,
        y: 10 + latitudeRatio * 80
    };
}

function normalizeToRatio(value: number, min: number, max: number): number {
    if (max <= min) return 0.5;
    return Math.min(1, Math.max(0, (value - min) / (max - min)));
}
