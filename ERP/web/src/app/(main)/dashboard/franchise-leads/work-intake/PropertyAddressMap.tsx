"use client";

import React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk';
import { KAKAO_MAP_LOADER_OPTIONS } from '@/lib/kakao-map-config';
import styles from './WorkIntakeEditModal.module.css';

type MapPosition = {
    readonly lat: number;
    readonly lng: number;
};

type PropertyAddressMapProps = {
    readonly address: string;
    readonly detailAddress: string;
};

function geocodeAddress(address: string): Promise<MapPosition | null> {
    return new Promise(resolve => {
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(address, (results, status) => {
            const first = results[0];
            const lat = Number(first?.y);
            const lng = Number(first?.x);
            resolve(status === kakao.maps.services.Status.OK && Number.isFinite(lat) && Number.isFinite(lng)
                ? { lat, lng }
                : null);
        });
    });
}

function relayoutMap(map: kakao.maps.Map, center: MapPosition) {
    const update = () => {
        map.relayout();
        map.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(update));
    window.setTimeout(update, 180);
    window.setTimeout(update, 520);
}

export function PropertyAddressMap({ address, detailAddress }: PropertyAddressMapProps) {
    const mapRef = React.useRef<kakao.maps.Map | null>(null);
    const mapHostRef = React.useRef<HTMLDivElement | null>(null);
    const [isKakaoLoading, kakaoLoadError] = useKakaoLoader(KAKAO_MAP_LOADER_OPTIONS);
    const [position, setPosition] = React.useState<MapPosition | null>(null);
    const [isGeocoding, setIsGeocoding] = React.useState(false);
    const fullAddress = [address, detailAddress].filter(Boolean).join(' ');
    const relayoutCurrentMap = React.useCallback(() => {
        if (mapRef.current && position) relayoutMap(mapRef.current, position);
    }, [position]);

    React.useEffect(() => {
        let cancelled = false;
        setPosition(null);
        setIsGeocoding(false);
        if (!address || isKakaoLoading || kakaoLoadError) return;

        setIsGeocoding(true);
        const timeoutId = window.setTimeout(() => {
            void geocodeAddress(address)
                .then(nextPosition => {
                    if (!cancelled) setPosition(nextPosition);
                })
                .catch(() => {
                    if (!cancelled) setPosition(null);
                })
                .finally(() => {
                    if (!cancelled) setIsGeocoding(false);
                });
        }, 350);
        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [address, isKakaoLoading, kakaoLoadError]);

    React.useEffect(() => {
        const host = mapHostRef.current;
        if (!host || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(relayoutCurrentMap);
        observer.observe(host);
        return () => observer.disconnect();
    }, [relayoutCurrentMap]);

    React.useEffect(() => {
        relayoutCurrentMap();
    }, [relayoutCurrentMap]);

    if (!address) return null;

    const mapLink = `https://map.kakao.com/link/search/${encodeURIComponent(fullAddress)}`;
    const status = kakaoLoadError
        ? '지도를 불러오지 못했습니다.'
        : isKakaoLoading || isGeocoding
            ? '주소 위치를 확인하고 있습니다.'
            : '주소의 지도 위치를 찾지 못했습니다.';

    return (
        <section className={styles.addressMap} aria-label="입점 요청 주소 지도">
            <div className={styles.addressMapHeader}>
                <div>
                    <strong><MapPin size={16} aria-hidden="true" /> 주소 위치</strong>
                    <span>{fullAddress}</span>
                </div>
                <a href={mapLink} target="_blank" rel="noreferrer">
                    카카오맵에서 보기 <ExternalLink size={14} aria-hidden="true" />
                </a>
            </div>
            <div ref={mapHostRef} className={styles.addressMapCanvas}>
                {position ? (
                    <Map
                        center={position}
                        level={3}
                        onCreate={map => {
                            mapRef.current = map;
                            relayoutMap(map, position);
                        }}
                        style={{ width: '100%', height: '100%' }}
                    >
                        <MapMarker position={position} />
                    </Map>
                ) : (
                    <div className={styles.addressMapFallback} role="status" aria-live="polite">{status}</div>
                )}
            </div>
        </section>
    );
}
