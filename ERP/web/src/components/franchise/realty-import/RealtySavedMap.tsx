import React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { CustomOverlayMap, Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import type { RealtyImportedListing } from './types';
import {
    buildRealtyMapCandidates,
    getInitialRealtyMapCenter,
    type RealtyMapCandidate,
    type RealtyMapPosition
} from './map-utils';

type RealtyMapPoint = RealtyMapCandidate & {
    readonly position: RealtyMapPosition;
    readonly source: 'stored' | 'geocoded';
};

export type RealtyMapMarkerIndex = {
    readonly key: string;
    readonly markerNumber: number;
};

type Props = {
    readonly groupKey: string;
    readonly listings: readonly RealtyImportedListing[];
    readonly title: string;
    readonly scopeLabel: string;
    readonly selectedKey: string;
    readonly onSelectKeyAction: (groupKey: string, key: string) => void;
    readonly onMarkerIndexChangeAction: (groupKey: string, markers: readonly RealtyMapMarkerIndex[]) => void;
};

const KAKAO_JAVASCRIPT_KEY = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || '26c1197bae99e17f8c1f3e688e22914d';

function relayoutRealtyMap(map: kakao.maps.Map, center: RealtyMapPosition) {
    const update = () => {
        map.relayout();
        map.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
    };

    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(update);
    });
    window.setTimeout(update, 180);
}

function geocodeCandidate(geocoder: kakao.maps.services.Geocoder, candidate: RealtyMapCandidate): Promise<RealtyMapPoint | null> {
    if (candidate.storedPosition) {
        return Promise.resolve({
            ...candidate,
            position: candidate.storedPosition,
            source: 'stored'
        });
    }

    return new Promise(resolve => {
        geocoder.addressSearch(candidate.address, (result, status) => {
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
            resolve({
                ...candidate,
                position: { lat, lng },
                source: 'geocoded'
            });
        });
    });
}

export function RealtySavedMap({
    groupKey,
    listings,
    title,
    scopeLabel,
    selectedKey,
    onSelectKeyAction,
    onMarkerIndexChangeAction
}: Props) {
    const [isKakaoLoading, kakaoLoadError] = useKakaoLoader({
        appkey: KAKAO_JAVASCRIPT_KEY,
        libraries: ['services']
    });
    const listingsKey = listings.map(item => {
        const listing = item.listing;
        return `${listing?.source || ''}:${listing?.id || listing?.sourceListingId || ''}:${listing?.address || listing?.region || ''}`;
    }).join('|');
    const candidates = React.useMemo(() => buildRealtyMapCandidates(listings), [listingsKey]);
    const [points, setPoints] = React.useState<readonly RealtyMapPoint[]>([]);
    const [isGeocoding, setIsGeocoding] = React.useState(false);
    const center = React.useMemo(() => getInitialRealtyMapCenter(points.map(point => point.position)), [points]);
    const activePoint = points.find(point => point.key === selectedKey) || points[0] || null;
    const unmappedCount = Math.max(0, candidates.length - points.length);

    React.useEffect(() => {
        setPoints([]);
        if (candidates.length === 0 || isKakaoLoading || kakaoLoadError) return;

        let cancelled = false;
        const runGeocoding = async () => {
            setIsGeocoding(true);
            try {
                const geocoder = new kakao.maps.services.Geocoder();
                const results: RealtyMapPoint[] = [];
                for (const candidate of candidates) {
                    const point = await geocodeCandidate(geocoder, candidate);
                    if (point) results.push(point);
                    if (cancelled) return;
                }
                setPoints(results);
            } finally {
                if (!cancelled) setIsGeocoding(false);
            }
        };

        void runGeocoding();
        return () => {
            cancelled = true;
        };
    }, [candidates, isKakaoLoading, kakaoLoadError]);

    React.useEffect(() => {
        onMarkerIndexChangeAction(groupKey, points.map((point, index) => ({
            key: point.key,
            markerNumber: index + 1
        })));

        if (points.length === 0) {
            if (selectedKey) onSelectKeyAction(groupKey, '');
            return;
        }

        if (!selectedKey || !points.some(point => point.key === selectedKey)) {
            onSelectKeyAction(groupKey, points[0]?.key || '');
        }
    }, [groupKey, onMarkerIndexChangeAction, onSelectKeyAction, points, selectedKey]);

    if (candidates.length === 0) return null;

    return (
        <section className={styles.realtyMapPanel} aria-label="저장 상가 지도">
            <div className={styles.realtyMapHeader}>
                <div>
                    <strong><MapPin size={14} /> {title}</strong>
                    <span>
                        {isKakaoLoading || isGeocoding ? '주소 좌표 확인 중' : `${points.length.toLocaleString()}곳 표시`}
                        {unmappedCount > 0 ? ` · 좌표 미확인 ${unmappedCount.toLocaleString()}곳` : ''}
                    </span>
                </div>
                <small>{scopeLabel}</small>
            </div>

            <div className={styles.realtyMapBody}>
                <div className={styles.realtyMapCanvas}>
                    {kakaoLoadError ? (
                        <div className={styles.locationMapFallback}>Kakao 지도 도메인 설정 필요</div>
                    ) : isKakaoLoading || isGeocoding ? (
                        <div className={styles.locationMapFallback}>지도 좌표 확인 중</div>
                    ) : points.length === 0 ? (
                        <div className={styles.locationMapFallback}>표시할 좌표가 없습니다.</div>
                    ) : (
                        <Map
                            key={`${center.lat}-${center.lng}-${points.length}`}
                            center={center}
                            level={6}
                            onCreate={(map) => relayoutRealtyMap(map, center)}
                            style={{ width: '100%', height: '100%' }}
                        >
                            {points.map((point, index) => (
                                <React.Fragment key={point.key}>
                                    <MapMarker position={point.position} onClick={() => onSelectKeyAction(groupKey, point.key)} />
                                    <CustomOverlayMap position={point.position} yAnchor={1.9}>
                                        <button
                                            type="button"
                                            className={point.key === activePoint?.key ? styles.realtyMapMarkerActive : styles.realtyMapMarker}
                                            onClick={() => onSelectKeyAction(groupKey, point.key)}
                                            title={point.address}
                                        >
                                            {index + 1}
                                        </button>
                                    </CustomOverlayMap>
                                </React.Fragment>
                            ))}
                        </Map>
                    )}
                </div>

                <div className={styles.realtyMapList}>
                    {activePoint ? (
                        <article>
                            <strong>{activePoint.title}</strong>
                            <span>{activePoint.address}</span>
                            <small>{activePoint.source === 'stored' ? '저장 좌표 사용' : 'Kakao 주소 검색 좌표'}</small>
                            {activePoint.sourceUrl ? (
                                <a href={activePoint.sourceUrl} target="_blank" rel="noreferrer">
                                    원문 열기 <ExternalLink size={12} />
                                </a>
                            ) : null}
                        </article>
                    ) : (
                        <div className={styles.locationEmpty}>지도에 표시할 상가를 선택해주세요.</div>
                    )}
                </div>
            </div>
        </section>
    );
}
