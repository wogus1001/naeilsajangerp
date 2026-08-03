"use client";

import React from 'react';
import { MapPin } from 'lucide-react';
import { useKakaoLoader } from 'react-kakao-maps-sdk';
import { KAKAO_MAP_LOADER_OPTIONS } from '@/lib/kakao-map-config';
import type { LocationMapRuntime } from '@/components/franchise/location-map/types';
import {
    type MeetingToolMarketMap,
    type MeetingToolMarketMapMeasurementMode,
    type MeetingToolMarketMapPoint,
    type MeetingToolMarketMapRadiusMeters
} from '@/lib/franchise-location-meeting-tool';
import {
    getLocationPathDistanceMeters,
    getLocationPolygonAreaSquareMeters
} from '../location-map/mapUtils';
import styles from './LocationMeetingTool.module.css';
import { LocationMeetingToolMarketMapCanvas } from './LocationMeetingToolMarketMapCanvas';
import {
    LocationMeetingToolMarketMapControls,
    LocationMeetingToolMarketMapMeasurePanel,
    type MarketMapLayer
} from './LocationMeetingToolMarketMapControls';
import type { FranchiseLocation } from './locationMasterTypes';

type MapPosition = {
    readonly lat: number;
    readonly lng: number;
};

type LocationMeetingToolMarketMapSectionProps = {
    readonly location: FranchiseLocation;
    readonly marketMap: MeetingToolMarketMap;
    readonly mapRuntime?: LocationMapRuntime | undefined;
    readonly onMarketMapChange: (marketMap: MeetingToolMarketMap) => void;
    readonly onMapPositionChange?: (position: MapPosition | null) => void;
};

function isFiniteCoordinate(value: number | null): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function getMapLevel(radiusMeters: MeetingToolMarketMapRadiusMeters): number {
    if (radiusMeters <= 300) return 4;
    if (radiusMeters <= 500) return 5;
    return 6;
}

export function LocationMeetingToolMarketMapSection({
    location,
    marketMap,
    mapRuntime = 'live',
    onMarketMapChange,
    onMapPositionChange
}: LocationMeetingToolMarketMapSectionProps) {
    if (mapRuntime === 'offline') {
        return (
            <OfflineLocationMeetingToolMarketMapSection
                location={location}
                marketMap={marketMap}
                onMarketMapChange={onMarketMapChange}
                onMapPositionChange={onMapPositionChange}
            />
        );
    }

    return (
        <LiveLocationMeetingToolMarketMapSection
            location={location}
            marketMap={marketMap}
            onMarketMapChange={onMarketMapChange}
            onMapPositionChange={onMapPositionChange}
        />
    );
}

function LiveLocationMeetingToolMarketMapSection({
    location,
    marketMap,
    onMarketMapChange,
    onMapPositionChange
}: Omit<LocationMeetingToolMarketMapSectionProps, 'mapRuntime'>) {
    const [isKakaoLoading, kakaoLoadError] = useKakaoLoader(KAKAO_MAP_LOADER_OPTIONS);
    const [geocodedPosition, setGeocodedPosition] = React.useState<MapPosition | null>(null);
    const [geocodeFailed, setGeocodeFailed] = React.useState(false);
    const [activeLayer, setActiveLayer] = React.useState<MarketMapLayer>('roadmap');
    const storedPosition = React.useMemo(
        () => {
            if (!isFiniteCoordinate(location.latitude) || !isFiniteCoordinate(location.longitude)) return null;
            return { lat: location.latitude, lng: location.longitude };
        },
        [location.latitude, location.longitude]
    );
    const center = storedPosition ?? geocodedPosition;
    const measurementMode = marketMap.measurementMode;
    const measurementPoints = marketMap.measurementPoints;
    const measurementDistanceMeters = getLocationPathDistanceMeters(measurementPoints);
    const measurementAreaSquareMeters = measurementMode === 'area'
        ? getLocationPolygonAreaSquareMeters(measurementPoints)
        : 0;
    const measurementPath = React.useMemo(
        () => measurementPoints.map(point => ({ lat: point.lat, lng: point.lng })),
        [measurementPoints]
    );

    React.useEffect(() => {
        setGeocodedPosition(null);
        setGeocodeFailed(false);
    }, [location.id, location.address]);

    React.useEffect(() => {
        if (storedPosition || geocodedPosition || geocodeFailed || isKakaoLoading || kakaoLoadError || !location.address) return;
        if (!window.kakao?.maps?.services) return;

        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(location.address, (results, status) => {
            const firstResult = results[0];
            if (status === kakao.maps.services.Status.OK && firstResult) {
                setGeocodedPosition({
                    lat: Number(firstResult.y),
                    lng: Number(firstResult.x)
                });
                return;
            }
            setGeocodeFailed(true);
        });
    }, [geocodeFailed, geocodedPosition, isKakaoLoading, kakaoLoadError, location.address, storedPosition]);

    React.useEffect(() => {
        onMapPositionChange?.(center);
    }, [center, onMapPositionChange]);

    const changeRadius = (radiusMeters: MeetingToolMarketMapRadiusMeters) => {
        onMarketMapChange({ ...marketMap, radiusMeters });
    };

    const changeMeasurementMode = (mode: MeetingToolMarketMapMeasurementMode) => {
        onMarketMapChange({
            ...marketMap,
            measurementMode: marketMap.measurementMode === mode ? 'none' : mode,
            measurementPoints: []
        });
    };

    const addMeasurementPoint = (_map: kakao.maps.Map, mouseEvent: kakao.maps.event.MouseEvent) => {
        if (measurementMode === 'none') return;
        onMarketMapChange({
            ...marketMap,
            measurementPoints: [
                ...marketMap.measurementPoints,
                {
                    lat: mouseEvent.latLng.getLat(),
                    lng: mouseEvent.latLng.getLng()
                }
            ]
        });
    };

    const updateMeasurementPoints = (points: readonly MeetingToolMarketMapPoint[]) => {
        onMarketMapChange({
            ...marketMap,
            measurementMode: points.length === 0 ? 'none' : marketMap.measurementMode,
            measurementPoints: points
        });
    };

    const undoMeasurementPoint = () => {
        updateMeasurementPoints(marketMap.measurementPoints.slice(0, -1));
    };

    const clearMeasurement = () => {
        onMarketMapChange({
            ...marketMap,
            measurementMode: 'none',
            measurementPoints: []
        });
    };

    return (
        <section className={styles.meetingToolMarketMap}>
            <div className={styles.meetingToolSectionHeader}>
                <div>
                    <h4>상권 지도</h4>
                    <p>후보지 주소와 좌표를 기준으로 미팅 중 확인할 상권 반경을 표시합니다.</p>
                </div>
                <LocationMeetingToolMarketMapControls
                    activeLayer={activeLayer}
                    marketMap={marketMap}
                    onLayerChange={setActiveLayer}
                    onMeasurementModeChange={changeMeasurementMode}
                    onRadiusChange={changeRadius}
                />
            </div>
            <LocationMeetingToolMarketMapMeasurePanel
                marketMap={marketMap}
                measurementAreaSquareMeters={measurementAreaSquareMeters}
                measurementDistanceMeters={measurementDistanceMeters}
                onClearMeasurement={clearMeasurement}
                onUndoMeasurementPoint={undoMeasurementPoint}
            />

            {kakaoLoadError ? (
                <div className={styles.meetingToolMapFallback}>
                    <MapPin size={22} />
                    <strong>Kakao 지도 도메인 설정이 필요합니다.</strong>
                    <span>현재 접속 도메인을 JavaScript 키의 Web 플랫폼 도메인에 등록해주세요.</span>
                </div>
            ) : isKakaoLoading ? (
                <div className={styles.meetingToolMapFallback}>
                    <MapPin size={22} />
                    <strong>지도를 불러오고 있습니다.</strong>
                    <span>후보지 좌표나 주소를 기준으로 상권 반경을 준비합니다.</span>
                </div>
            ) : center ? (
                <LocationMeetingToolMarketMapCanvas
                    activeLayer={activeLayer}
                    center={center}
                    mapLevel={getMapLevel(marketMap.radiusMeters)}
                    measurementAreaSquareMeters={measurementAreaSquareMeters}
                    measurementDistanceMeters={measurementDistanceMeters}
                    measurementMode={measurementMode}
                    measurementPath={measurementPath}
                    radiusMeters={marketMap.radiusMeters}
                    onAddMeasurementPoint={addMeasurementPoint}
                />
            ) : (
                <div className={styles.meetingToolMapFallback}>
                    <MapPin size={22} />
                    <strong>지도에 표시할 좌표가 없습니다.</strong>
                    <span>후보지 주소나 좌표를 저장하면 상권 지도를 자동으로 표시합니다.</span>
                </div>
            )}
        </section>
    );
}

function OfflineLocationMeetingToolMarketMapSection({
    location,
    marketMap,
    onMarketMapChange,
    onMapPositionChange
}: Omit<LocationMeetingToolMarketMapSectionProps, 'mapRuntime'>) {
    const [activeLayer, setActiveLayer] = React.useState<MarketMapLayer>('roadmap');
    const storedPosition = React.useMemo(
        () => {
            if (!isFiniteCoordinate(location.latitude) || !isFiniteCoordinate(location.longitude)) return null;
            return { lat: location.latitude, lng: location.longitude };
        },
        [location.latitude, location.longitude]
    );
    const measurementDistanceMeters = getLocationPathDistanceMeters(marketMap.measurementPoints);
    const measurementAreaSquareMeters = marketMap.measurementMode === 'area'
        ? getLocationPolygonAreaSquareMeters(marketMap.measurementPoints)
        : 0;

    React.useEffect(() => {
        onMapPositionChange?.(storedPosition);
    }, [onMapPositionChange, storedPosition]);

    const changeRadius = (radiusMeters: MeetingToolMarketMapRadiusMeters) => {
        onMarketMapChange({ ...marketMap, radiusMeters });
    };
    const changeMeasurementMode = (mode: MeetingToolMarketMapMeasurementMode) => {
        onMarketMapChange({
            ...marketMap,
            measurementMode: marketMap.measurementMode === mode ? 'none' : mode,
            measurementPoints: []
        });
    };
    const updateMeasurementPoints = (points: readonly MeetingToolMarketMapPoint[]) => {
        onMarketMapChange({
            ...marketMap,
            measurementMode: points.length === 0 ? 'none' : marketMap.measurementMode,
            measurementPoints: points
        });
    };

    return (
        <section className={styles.meetingToolMarketMap}>
            <div className={styles.meetingToolSectionHeader}>
                <div>
                    <h4>상권 지도</h4>
                    <p>후보지 주소와 좌표를 기준으로 미팅 중 확인할 상권 반경을 표시합니다.</p>
                </div>
                <LocationMeetingToolMarketMapControls
                    activeLayer={activeLayer}
                    marketMap={marketMap}
                    onLayerChange={setActiveLayer}
                    onMeasurementModeChange={changeMeasurementMode}
                    onRadiusChange={changeRadius}
                />
            </div>
            <LocationMeetingToolMarketMapMeasurePanel
                marketMap={marketMap}
                measurementAreaSquareMeters={measurementAreaSquareMeters}
                measurementDistanceMeters={measurementDistanceMeters}
                onClearMeasurement={() => {
                    onMarketMapChange({
                        ...marketMap,
                        measurementMode: 'none',
                        measurementPoints: []
                    });
                }}
                onUndoMeasurementPoint={() => {
                    updateMeasurementPoints(marketMap.measurementPoints.slice(0, -1));
                }}
            />
            <div className={styles.meetingToolMapFallback}>
                <MapPin size={22} />
                <strong>Kakao 지도 도메인 설정이 필요합니다.</strong>
                <span>현재 접속 도메인을 JavaScript 키의 Web 플랫폼 도메인에 등록해주세요.</span>
            </div>
        </section>
    );
}
