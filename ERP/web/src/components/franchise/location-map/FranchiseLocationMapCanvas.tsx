"use client";

import React from 'react';
import { Building2, MapPin } from 'lucide-react';
import { Circle, CustomOverlayMap, Map, MapMarker, Polygon, Polyline, useKakaoLoader } from 'react-kakao-maps-sdk';
import { KAKAO_MAP_LOADER_OPTIONS } from '@/lib/kakao-map-config';
import {
    getLocationMapLevel,
    LOCATION_MAP_STATUS_COLORS
} from './mapUtils';
import type {
    LocationMapMeasurementMode,
    LocationMapPoint,
    LocationMapPosition,
    LocationMapRadiusMeters
} from './types';
import styles from './FranchiseLocationMapService.module.css';

type Props = {
    readonly activeLocationId: string;
    readonly activePoint: LocationMapPoint | null;
    readonly center: LocationMapPosition;
    readonly focusRequestId: number;
    readonly focusedPoint: LocationMapPoint | null;
    readonly isBusy: boolean;
    readonly isManualRadius: boolean;
    readonly isRadiusPicking: boolean;
    readonly measurementMode: LocationMapMeasurementMode;
    readonly measurementPoints: readonly LocationMapPosition[];
    readonly points: readonly LocationMapPoint[];
    readonly radiusCenter: LocationMapPosition | null;
    readonly radiusMeters: LocationMapRadiusMeters;
    readonly onKakaoReadyChange: (ready: boolean) => void;
    readonly onMeasurementPointAdd: (position: LocationMapPosition) => void;
    readonly onRadiusCenterPick: (position: LocationMapPosition) => void;
    readonly onSelectPoint: (locationId: string) => void;
};

function relayoutMap(map: kakao.maps.Map, center: LocationMapPosition) {
    const update = () => {
        map.relayout();
        map.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
    };
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(update);
    });
    window.setTimeout(update, 180);
    window.setTimeout(update, 520);
}

function focusMapOnPoint(map: kakao.maps.Map, point: LocationMapPoint) {
    const nextCenter = new kakao.maps.LatLng(point.position.lat, point.position.lng);
    map.panTo(nextCenter);
    if (map.getLevel() > 6) {
        map.setLevel(6);
    }
}

export function FranchiseLocationMapCanvas({
    activeLocationId,
    activePoint,
    center,
    focusRequestId,
    focusedPoint,
    isBusy,
    isManualRadius,
    isRadiusPicking,
    measurementMode,
    measurementPoints,
    points,
    radiusCenter,
    radiusMeters,
    onKakaoReadyChange,
    onMeasurementPointAdd,
    onRadiusCenterPick,
    onSelectPoint
}: Props) {
    const mapRef = React.useRef<kakao.maps.Map | null>(null);
    const mapHostRef = React.useRef<HTMLDivElement | null>(null);
    const [isKakaoLoading, kakaoLoadError] = useKakaoLoader(KAKAO_MAP_LOADER_OPTIONS);
    const kakaoReady = !isKakaoLoading && !kakaoLoadError;
    const mapLevel = getLocationMapLevel(points);
    const displayCenter = focusedPoint?.position || center;
    const isMeasuring = measurementMode !== 'none';
    const measurementPath = measurementPoints.map(position => ({ lat: position.lat, lng: position.lng }));
    const relayoutCurrentMap = React.useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        relayoutMap(map, displayCenter);
    }, [displayCenter]);

    React.useEffect(() => {
        onKakaoReadyChange(kakaoReady);
    }, [kakaoReady, onKakaoReadyChange]);

    React.useEffect(() => {
        const host = mapHostRef.current;
        if (!host || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(() => relayoutCurrentMap());
        observer.observe(host);
        return () => observer.disconnect();
    }, [relayoutCurrentMap]);

    React.useEffect(() => {
        relayoutCurrentMap();
    }, [mapLevel, points.length, relayoutCurrentMap]);

    React.useEffect(() => {
        const map = mapRef.current;
        if (!map || !focusedPoint) return;
        focusMapOnPoint(map, focusedPoint);
    }, [focusRequestId, focusedPoint]);

    if (kakaoLoadError) {
        return (
            <div className={styles.mapFallback}>
                <MapPin size={24} />
                <strong>Kakao 지도 도메인 설정이 필요합니다.</strong>
                <span>JavaScript 키의 Web 플랫폼 도메인에 현재 주소를 등록해주세요.</span>
            </div>
        );
    }

    if (isKakaoLoading || isBusy) {
        return (
            <div className={styles.mapFallback}>
                <MapPin size={24} />
                <strong>지도 좌표를 확인하고 있습니다.</strong>
                <span>저장 좌표가 없으면 주소를 기준으로 Kakao 좌표를 조회합니다.</span>
            </div>
        );
    }

    if (points.length === 0) {
        return (
            <div className={styles.mapFallback}>
                <Building2 size={24} />
                <strong>지도에 표시할 물건지가 없습니다.</strong>
                <span>주소나 좌표가 저장된 가맹 운영점 또는 출점 후보지를 등록해주세요.</span>
            </div>
        );
    }

    return (
        <div
            ref={mapHostRef}
            className={`${styles.mapInner} ${isRadiusPicking || isMeasuring ? styles.mapInnerPicking : ''}`}
        >
            <Map
                center={displayCenter}
                level={mapLevel}
                onClick={(_, mouseEvent) => {
                    const latLng = mouseEvent.latLng;
                    const position = { lat: latLng.getLat(), lng: latLng.getLng() };
                    if (isRadiusPicking) {
                        onRadiusCenterPick(position);
                        return;
                    }
                    if (isMeasuring) onMeasurementPointAdd(position);
                }}
                onCreate={(map) => {
                    mapRef.current = map;
                    relayoutMap(map, displayCenter);
                }}
                style={{ width: '100%', height: '100%' }}
            >
                {radiusCenter ? (
                    <Circle
                        center={radiusCenter}
                        radius={radiusMeters}
                        fillColor="#3182f6"
                        fillOpacity={0.08}
                        strokeColor="#3182f6"
                        strokeOpacity={0.72}
                        strokeWeight={2}
                        zIndex={1}
                    />
                ) : null}
                {radiusCenter && isManualRadius ? (
                    <CustomOverlayMap position={radiusCenter} yAnchor={1.4}>
                        <span className={styles.manualRadiusMarker}>기준점</span>
                    </CustomOverlayMap>
                ) : null}
                {measurementMode === 'area' && measurementPoints.length >= 3 ? (
                    <Polygon
                        path={measurementPath}
                        fillColor="#14b8a6"
                        fillOpacity={0.14}
                        strokeColor="#0f766e"
                        strokeOpacity={0.82}
                        strokeWeight={2}
                        zIndex={2}
                    />
                ) : null}
                {measurementPoints.length >= 2 && (measurementMode === 'distance' || measurementPoints.length < 3) ? (
                    <Polyline
                        path={measurementPath}
                        endArrow={measurementMode === 'distance'}
                        strokeColor="#0f766e"
                        strokeOpacity={0.86}
                        strokeWeight={3}
                        zIndex={3}
                    />
                ) : null}
                {measurementPoints.map((position, index) => (
                    <CustomOverlayMap key={`${position.lat}-${position.lng}-${index}`} position={position} yAnchor={0.5}>
                        <span className={styles.measurementPoint}>{index + 1}</span>
                    </CustomOverlayMap>
                ))}
                {points.map((point, index) => {
                    const isActive = activeLocationId === point.location.id;
                    const markerClassName = point.kind === 'operation'
                        ? styles.operationMarker
                        : styles.candidateMarker;
                    return (
                        <React.Fragment key={point.location.id}>
                            <MapMarker position={point.position} onClick={() => onSelectPoint(point.location.id)} />
                            <CustomOverlayMap position={point.position} yAnchor={1.75}>
                                <button
                                    type="button"
                                    className={`${markerClassName} ${isActive ? styles.mapMarkerActive : ''}`}
                                    onClick={() => onSelectPoint(point.location.id)}
                                    title={point.location.address || point.location.region || point.location.name}
                                >
                                    <span
                                        className={styles.markerDot}
                                        style={{ backgroundColor: LOCATION_MAP_STATUS_COLORS[point.location.status] }}
                                    />
                                    <strong>{index + 1}</strong>
                                    <small>{point.location.name}</small>
                                </button>
                            </CustomOverlayMap>
                        </React.Fragment>
                    );
                })}
            </Map>
        </div>
    );
}
