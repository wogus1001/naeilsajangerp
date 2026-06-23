"use client";

import React from 'react';
import { Building2, MapPin } from 'lucide-react';
import { CustomOverlayMap, Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk';
import { KAKAO_MAP_LOADER_OPTIONS } from '@/lib/kakao-map-config';
import {
    getLocationMapLevel,
    LOCATION_MAP_STATUS_COLORS
} from './mapUtils';
import type {
    LocationMapPoint,
    LocationMapPosition
} from './types';
import styles from './FranchiseLocationMapService.module.css';

type Props = {
    readonly activeLocationId: string;
    readonly center: LocationMapPosition;
    readonly isBusy: boolean;
    readonly points: readonly LocationMapPoint[];
    readonly onKakaoReadyChange: (ready: boolean) => void;
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

export function FranchiseLocationMapCanvas({
    activeLocationId,
    center,
    isBusy,
    points,
    onKakaoReadyChange,
    onSelectPoint
}: Props) {
    const mapRef = React.useRef<kakao.maps.Map | null>(null);
    const mapHostRef = React.useRef<HTMLDivElement | null>(null);
    const [isKakaoLoading, kakaoLoadError] = useKakaoLoader(KAKAO_MAP_LOADER_OPTIONS);
    const kakaoReady = !isKakaoLoading && !kakaoLoadError;
    const mapLevel = getLocationMapLevel(points);
    const relayoutCurrentMap = React.useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        relayoutMap(map, center);
    }, [center]);

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
        <div ref={mapHostRef} className={styles.mapInner}>
            <Map
                center={center}
                level={mapLevel}
                onCreate={(map) => {
                    mapRef.current = map;
                    relayoutMap(map, center);
                }}
                style={{ width: '100%', height: '100%' }}
            >
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
