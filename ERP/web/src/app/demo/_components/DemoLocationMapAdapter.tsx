'use client';

import React from 'react';
import { FranchiseLocationMapWorkspace } from '@/components/franchise/location-map/FranchiseLocationMapWorkspace';
import {
    EMPTY_LOCATION_MAP_FILTERS,
    buildComparisonRadiusPoints,
    buildLocationMapCounts,
    buildRadiusAnalysis,
    buildRadiusAnalysisFromPosition,
    filterLocationMapItems,
    getLocationMapCenter,
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
import { LOCATION_MAP_RADIUS_OPTIONS } from '@/components/franchise/location-map/types';
import {
    FRANCHISE_LOCATION_STATUSES,
    type FranchiseLocation,
    type FranchiseLocationStatus
} from '@/components/franchise/operations/types';
import type { DemoActionHandler, DemoRole, DemoScreenId } from '../demoTypes';
import {
    selectDemoLocationMasterItems,
    selectDemoOperationLocations
} from './DemoFranchiseSampleData';
import { DemoGuidedLayout } from './DemoScreenGuide';

type DemoLocationMapAdapterProps = {
    readonly role: DemoRole;
    readonly onScreenChange: (screen: DemoScreenId) => void;
    readonly onSimulate: DemoActionHandler;
};

const DEMO_COMPANY_NAME = '내일';
export function DemoLocationMapAdapter({ role, onScreenChange, onSimulate }: DemoLocationMapAdapterProps) {
    const mapLocations = React.useMemo<readonly FranchiseLocation[]>(() => [
        ...selectDemoOperationLocations(role),
        ...selectDemoLocationMasterItems(role)
    ], [role]);
    const [filters, setFilters] = React.useState<LocationMapFilters>(() => ({
        ...EMPTY_LOCATION_MAP_FILTERS,
        statuses: new Set(EMPTY_LOCATION_MAP_FILTERS.statuses)
    }));
    const [activeLocationId, setActiveLocationId] = React.useState(mapLocations[0]?.id ?? '');
    const [focusedLocationId, setFocusedLocationId] = React.useState('');
    const [focusRequestId, setFocusRequestId] = React.useState(0);
    const [radiusMeters, setRadiusMeters] = React.useState<LocationMapRadiusMeters>(LOCATION_MAP_RADIUS_OPTIONS[1]);
    const [radiusBaseMode, setRadiusBaseMode] = React.useState<LocationMapRadiusBaseMode>('selected');
    const [manualRadiusCenter, setManualRadiusCenter] = React.useState<LocationMapPosition | null>(null);
    const [isRadiusPicking, setIsRadiusPicking] = React.useState(false);
    const [measurementMode, setMeasurementMode] = React.useState<LocationMapMeasurementMode>('none');
    const [measurementPoints, setMeasurementPoints] = React.useState<readonly LocationMapPosition[]>([]);
    const [, setKakaoReady] = React.useState(false);

    const visibleLocations = React.useMemo(
        () => filterLocationMapItems(mapLocations, filters),
        [filters, mapLocations]
    );
    const points = React.useMemo(
        () => visibleLocations.flatMap(location => {
            const position = getStoredPosition(location);
            if (!position) return [];
            return [{
                location,
                kind: getLocationMapKind(location),
                position,
                source: 'stored'
            } satisfies LocationMapPoint];
        }),
        [visibleLocations]
    );
    const activePoint = points.find(point => point.location.id === activeLocationId) ?? points[0] ?? null;
    const focusedPoint = points.find(point => point.location.id === focusedLocationId) ?? null;
    const radiusCenter = radiusBaseMode === 'manual' ? manualRadiusCenter : activePoint?.position ?? null;
    const counts = React.useMemo(
        () => buildLocationMapCounts(mapLocations, visibleLocations, points),
        [mapLocations, points, visibleLocations]
    );
    const radiusAnalysis = React.useMemo(
        () => radiusBaseMode === 'manual'
            ? buildRadiusAnalysisFromPosition(manualRadiusCenter, points, radiusMeters)
            : buildRadiusAnalysis(activePoint, points, radiusMeters),
        [activePoint, manualRadiusCenter, points, radiusBaseMode, radiusMeters]
    );
    const comparisonRadiusPoints = React.useMemo(
        () => buildComparisonRadiusPoints(radiusAnalysis, radiusBaseMode, activePoint, points),
        [activePoint, points, radiusAnalysis, radiusBaseMode]
    );
    const measurementDistanceMeters = React.useMemo(
        () => getLocationPathDistanceMeters(measurementPoints),
        [measurementPoints]
    );
    const measurementAreaSquareMeters = React.useMemo(
        () => measurementMode === 'area' ? getLocationPolygonAreaSquareMeters(measurementPoints) : 0,
        [measurementMode, measurementPoints]
    );

    React.useEffect(() => {
        if (!activePoint) {
            setActiveLocationId('');
            setFocusedLocationId('');
            return;
        }
        if (activePoint.location.id !== activeLocationId) setActiveLocationId(activePoint.location.id);
        if (focusedLocationId && !points.some(point => point.location.id === focusedLocationId)) {
            setFocusedLocationId('');
        }
    }, [activeLocationId, activePoint, focusedLocationId, points]);

    const selectPoint = (locationId: string) => {
        const selectedPoint = points.find(point => point.location.id === locationId);
        if (!selectedPoint) return;
        setActiveLocationId(locationId);
        setFocusedLocationId(locationId);
        setFocusRequestId(current => current + 1);
        setRadiusBaseMode('selected');
        setIsRadiusPicking(false);
        onSimulate(`${selectedPoint.location.name} 지도 선택`);
    };
    const updateMode = (mode: LocationMapFilters['mode']) => setFilters(current => ({ ...current, mode }));
    const updateQuery = (query: string) => setFilters(current => ({ ...current, query }));
    const toggleStatus = (status: FranchiseLocationStatus) => {
        setFilters(current => ({ ...current, statuses: toggleLocationMapStatus(current.statuses, status) }));
    };
    const selectAllStatuses = () => {
        setFilters(current => ({ ...current, statuses: new Set(FRANCHISE_LOCATION_STATUSES) }));
    };
    const changeMeasurementMode = (mode: LocationMapMeasurementMode) => {
        const nextMode: LocationMapMeasurementMode = measurementMode === mode ? 'none' : mode;
        setMeasurementMode(nextMode);
        setMeasurementPoints([]);
        setIsRadiusPicking(false);
        onSimulate(nextMode === 'none' ? '샘플 반경분석 보기' : `샘플 ${nextMode === 'distance' ? '거리재기' : '면적재기'} 보기`);
    };
    const addMeasurementPoint = (position: LocationMapPosition) => {
        if (measurementMode === 'none') return;
        setMeasurementPoints(current => [...current, position]);
    };
    const clearMeasurement = () => {
        setMeasurementMode('none');
        setMeasurementPoints([]);
    };
    const startRadiusPicking = () => {
        setRadiusBaseMode('manual');
        setIsRadiusPicking(true);
        clearMeasurement();
        onSimulate('샘플 직접 반경 그리기');
    };
    const pickRadiusCenter = (position: LocationMapPosition) => {
        setManualRadiusCenter(position);
        setRadiusBaseMode('manual');
        setIsRadiusPicking(false);
        onSimulate('샘플 반경 기준점 선택');
    };
    const useSelectedRadius = () => {
        setRadiusBaseMode('selected');
        setIsRadiusPicking(false);
    };

    return (
        <DemoGuidedLayout screen="locationMap" onScreenChange={onScreenChange}>
            <div data-demo-id="location-map-page">
                <FranchiseLocationMapWorkspace
                    activeLocationId={activeLocationId}
                    activePoint={activePoint}
                    center={getLocationMapCenter(points)}
                    companyName={DEMO_COMPANY_NAME}
                    comparisonRadiusPoints={comparisonRadiusPoints}
                    counts={counts}
                    errorMessage=""
                    filters={filters}
                    focusRequestId={focusRequestId}
                    focusedPoint={focusedPoint}
                    isBusy={false}
                    isManualRadius={radiusBaseMode === 'manual'}
                    isRadiusPicking={isRadiusPicking}
                    measurementAreaSquareMeters={measurementAreaSquareMeters}
                    measurementDistanceMeters={measurementDistanceMeters}
                    measurementMode={measurementMode}
                    measurementPoints={measurementPoints}
                    mapRuntime="offline"
                    onKakaoReadyChange={setKakaoReady}
                    onMeasurementClear={clearMeasurement}
                    onMeasurementModeChange={changeMeasurementMode}
                    onMeasurementPointAdd={addMeasurementPoint}
                    onMeasurementUndo={() => setMeasurementPoints(current => current.slice(0, -1))}
                    onModeChange={updateMode}
                    onQueryChange={updateQuery}
                    onRadiusCenterPick={pickRadiusCenter}
                    onRadiusChange={setRadiusMeters}
                    onSelectAllStatuses={selectAllStatuses}
                    onSelectPoint={selectPoint}
                    onStartRadiusPicking={startRadiusPicking}
                    onToggleStatus={toggleStatus}
                    onUseSelectedRadius={useSelectedRadius}
                    points={points}
                    radiusAnalysis={radiusAnalysis}
                    radiusBaseMode={radiusBaseMode}
                    radiusCenter={radiusCenter}
                    radiusMeters={radiusMeters}
                />
            </div>
        </DemoGuidedLayout>
    );
}
