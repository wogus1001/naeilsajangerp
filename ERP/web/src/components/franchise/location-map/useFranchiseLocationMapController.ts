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
    EMPTY_LOCATION_MAP_FILTERS,
    filterLocationMapItems,
    getLocationMapCenter,
    getLocationMapKind,
    getStoredPosition,
    toggleLocationMapStatus
} from './mapUtils';
import type {
    LocationMapFilters,
    LocationMapMode,
    LocationMapPoint
} from './types';

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
        if (!kakaoReady || visibleLocations.length === 0) return;

        let cancelled = false;
        const run = async () => {
            setIsGeocoding(true);
            try {
                const geocoder = new kakao.maps.services.Geocoder();
                const nextPoints: LocationMapPoint[] = [];
                let geocodeAttempts = 0;
                for (const location of visibleLocations) {
                    const storedPosition = getStoredPosition(location);
                    const kind = getLocationMapKind(location);
                    if (storedPosition) {
                        nextPoints.push({ location, kind, position: storedPosition, source: 'stored' });
                        continue;
                    }
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
            return;
        }
        if (!activeLocationId || !points.some(point => point.location.id === activeLocationId)) {
            setActiveLocationId(points[0]?.location.id || '');
        }
    }, [activeLocationId, points]);

    const setMode = (mode: LocationMapMode) => setFilters(prev => ({ ...prev, mode }));
    const setQuery = (query: string) => setFilters(prev => ({ ...prev, query }));
    const toggleStatus = (status: FranchiseLocationStatus) => {
        setFilters(prev => ({ ...prev, statuses: toggleLocationMapStatus(prev.statuses, status) }));
    };
    const selectAllStatuses = () => setFilters(prev => ({ ...prev, statuses: new Set(FRANCHISE_LOCATION_STATUSES) }));

    const activePoint = points.find(point => point.location.id === activeLocationId) || points[0] || null;
    const counts = buildLocationMapCounts(locations, visibleLocations, points);
    const center = getLocationMapCenter(points);

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
        locations,
        points,
        visibleLocations,
        loadLocations,
        selectAllStatuses,
        setActiveLocationId,
        setMode,
        setQuery,
        toggleStatus
    };
}
