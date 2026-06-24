"use client";

import React from 'react';
import {
    FRANCHISE_LOCATION_STATUSES,
    type FranchiseLocation,
    type FranchiseLocationStatus
} from '@/components/franchise/operations/types';
import {
    fetchFranchiseLocations,
    readStoredUser
} from '@/components/franchise/operations/requests';
import {
    buildLocationMapCounts,
    buildRadiusAnalysis,
    buildRadiusAnalysisFromPosition,
    EMPTY_LOCATION_MAP_FILTERS,
    filterLocationMapItems,
    getLocationMapCenter,
    getLocationMapKind,
    getLocationPathDistanceMeters,
    getLocationPolygonAreaSquareMeters,
    getStoredPosition,
    toggleLocationMapStatus
} from './mapUtils';
import type {
    LocationMapFilters,
    LocationMapMeasurementMode,
    LocationMapMode,
    LocationMapPoint,
    LocationMapPosition,
    LocationMapRadiusBaseMode,
    LocationMapRadiusMeters
} from './types';
import { LOCATION_MAP_RADIUS_OPTIONS } from './types';

const MAX_GEOCODE_LOCATIONS = 160;

function geocodeLocation(
    geocoder: kakao.maps.services.Geocoder,
    location: FranchiseLocation
): Promise<LocationMapPoint | null> {
    const kind = getLocationMapKind(location);
    if (!location.address.trim()) return Promise.resolve(null);
    return new Promise(resolve => {
        geocoder.addressSearch(location.address, (result, status) => {
            if (status !== kakao.maps.services.Status.OK) {
                resolve(null);
                return;
            }

            const first = result[0];
            const lat = Number(first?.y);
            const lng = Number(first?.x);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                resolve(null);
                return;
            }
            resolve({ location, kind, position: { lat, lng }, source: 'geocoded' });
        });
    });
}

export function useFranchiseLocationMapController(kakaoReady: boolean) {
    const [userId, setUserId] = React.useState('');
    const [companyName, setCompanyName] = React.useState('');
    const [locations, setLocations] = React.useState<readonly FranchiseLocation[]>([]);
    const [filters, setFilters] = React.useState<LocationMapFilters>(EMPTY_LOCATION_MAP_FILTERS);
    const [points, setPoints] = React.useState<readonly LocationMapPoint[]>([]);
    const [activeLocationId, setActiveLocationId] = React.useState('');
    const [focusedLocationId, setFocusedLocationId] = React.useState('');
    const [focusRequestId, setFocusRequestId] = React.useState(0);
    const [radiusMeters, setRadiusMeters] = React.useState<LocationMapRadiusMeters>(LOCATION_MAP_RADIUS_OPTIONS[1]);
    const [radiusBaseMode, setRadiusBaseMode] = React.useState<LocationMapRadiusBaseMode>('selected');
    const [manualRadiusCenter, setManualRadiusCenter] = React.useState<LocationMapPosition | null>(null);
    const [isRadiusPicking, setIsRadiusPicking] = React.useState(false);
    const [measurementMode, setMeasurementModeState] = React.useState<LocationMapMeasurementMode>('none');
    const [measurementPoints, setMeasurementPoints] = React.useState<readonly LocationMapPosition[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isGeocoding, setIsGeocoding] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');

    React.useEffect(() => {
        const parsedUser = readStoredUser();
        const currentUserId = parsedUser.uid || parsedUser.id || localStorage.getItem('userId') || '';
        const storedCompanyName = parsedUser.companyName || parsedUser.company_name || '';
        setUserId(currentUserId);
        setCompanyName(storedCompanyName);
        if (!currentUserId) {
            setIsLoading(false);
            setErrorMessage('로그인 정보가 없어 물건지 지도를 불러올 수 없습니다.');
        }
    }, []);

    const loadLocations = React.useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        setErrorMessage('');
        try {
            const nextLocations = await fetchFranchiseLocations({ userId, companyName });
            setLocations(nextLocations);
        } catch (error) {
            console.error('Failed to load franchise location map:', error);
            setLocations([]);
            setErrorMessage(error instanceof Error ? error.message : '물건지 데이터를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [companyName, userId]);

    React.useEffect(() => {
        if (!userId) return;
        void loadLocations();
    }, [loadLocations, userId]);

    const visibleLocations = React.useMemo(
        () => filterLocationMapItems(locations, filters),
        [filters, locations]
    );

    React.useEffect(() => {
        setPoints([]);
        const storedPoints = visibleLocations.flatMap(location => {
            const storedPosition = getStoredPosition(location);
            if (!storedPosition) return [];
            return [{
                location,
                kind: getLocationMapKind(location),
                position: storedPosition,
                source: 'stored' as const
            }];
        });
        if (!kakaoReady || visibleLocations.length === 0) {
            setPoints(storedPoints);
            return;
        }

        let cancelled = false;
        const run = async () => {
            setIsGeocoding(true);
            try {
                const geocoder = new kakao.maps.services.Geocoder();
                const nextPoints: LocationMapPoint[] = [...storedPoints];
                const storedLocationIds = new Set(storedPoints.map(point => point.location.id));
                let geocodeAttempts = 0;
                for (const location of visibleLocations) {
                    if (storedLocationIds.has(location.id)) continue;
                    if (geocodeAttempts >= MAX_GEOCODE_LOCATIONS) continue;
                    geocodeAttempts += 1;
                    const point = await geocodeLocation(geocoder, location);
                    if (cancelled) return;
                    if (point) nextPoints.push(point);
                }
                setPoints(nextPoints);
            } finally {
                if (!cancelled) setIsGeocoding(false);
            }
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [kakaoReady, visibleLocations]);

    React.useEffect(() => {
        if (points.length === 0) {
            setActiveLocationId('');
            setFocusedLocationId('');
            return;
        }
        if (!activeLocationId || !points.some(point => point.location.id === activeLocationId)) {
            setActiveLocationId(points[0]?.location.id || '');
        }
        if (focusedLocationId && !points.some(point => point.location.id === focusedLocationId)) {
            setFocusedLocationId('');
        }
    }, [activeLocationId, focusedLocationId, points]);

    const setMode = (mode: LocationMapMode) => setFilters(prev => ({ ...prev, mode }));
    const setQuery = (query: string) => setFilters(prev => ({ ...prev, query }));
    const toggleStatus = (status: FranchiseLocationStatus) => {
        setFilters(prev => ({ ...prev, statuses: toggleLocationMapStatus(prev.statuses, status) }));
    };
    const selectAllStatuses = () => setFilters(prev => ({ ...prev, statuses: new Set(FRANCHISE_LOCATION_STATUSES) }));
    const selectPoint = (locationId: string) => {
        setActiveLocationId(locationId);
        setFocusedLocationId(locationId);
        setFocusRequestId(prev => prev + 1);
        setRadiusBaseMode('selected');
        setIsRadiusPicking(false);
    };
    const setMeasurementMode = (mode: LocationMapMeasurementMode) => {
        setMeasurementModeState(prev => (prev === mode ? 'none' : mode));
        setMeasurementPoints([]);
        setIsRadiusPicking(false);
    };
    const addMeasurementPoint = (position: LocationMapPosition) => {
        if (measurementMode === 'none') return;
        setMeasurementPoints(prev => [...prev, position]);
    };
    const undoMeasurementPoint = () => {
        setMeasurementPoints(prev => prev.slice(0, -1));
    };
    const clearMeasurement = () => {
        setMeasurementModeState('none');
        setMeasurementPoints([]);
    };

    const activePoint = points.find(point => point.location.id === activeLocationId) || points[0] || null;
    const focusedPoint = points.find(point => point.location.id === focusedLocationId) || null;
    const radiusCenter = radiusBaseMode === 'manual'
        ? manualRadiusCenter
        : activePoint?.position || null;
    const radiusAnalysis = radiusBaseMode === 'manual'
        ? buildRadiusAnalysisFromPosition(manualRadiusCenter, points, radiusMeters)
        : buildRadiusAnalysis(activePoint, points, radiusMeters);
    const measurementDistanceMeters = getLocationPathDistanceMeters(measurementPoints);
    const measurementAreaSquareMeters = measurementMode === 'area'
        ? getLocationPolygonAreaSquareMeters(measurementPoints)
        : 0;
    const counts = buildLocationMapCounts(locations, visibleLocations, points);
    const center = getLocationMapCenter(points);
    const startRadiusPicking = () => {
        setRadiusBaseMode('manual');
        setIsRadiusPicking(true);
        setMeasurementModeState('none');
        setMeasurementPoints([]);
    };
    const useSelectedRadius = () => {
        setRadiusBaseMode('selected');
        setIsRadiusPicking(false);
    };
    const pickRadiusCenter = (position: LocationMapPosition) => {
        setManualRadiusCenter(position);
        setRadiusBaseMode('manual');
        setIsRadiusPicking(false);
    };

    return {
        companyName,
        counts,
        center,
        activePoint,
        activeLocationId,
        filters,
        isLoading,
        isGeocoding,
        errorMessage,
        focusRequestId,
        focusedPoint,
        isRadiusPicking,
        locations,
        manualRadiusCenter,
        measurementAreaSquareMeters,
        measurementDistanceMeters,
        measurementMode,
        measurementPoints,
        points,
        radiusAnalysis,
        radiusBaseMode,
        radiusCenter,
        radiusMeters,
        visibleLocations,
        loadLocations,
        addMeasurementPoint,
        clearMeasurement,
        selectAllStatuses,
        setMode,
        setMeasurementMode,
        setQuery,
        setRadiusMeters,
        startRadiusPicking,
        undoMeasurementPoint,
        useSelectedRadius,
        pickRadiusCenter,
        selectPoint,
        toggleStatus
    };
}
