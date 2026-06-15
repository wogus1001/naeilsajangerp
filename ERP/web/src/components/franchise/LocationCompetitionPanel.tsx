"use client";

import React from 'react';
import { ExternalLink, MapPin, Megaphone, MessageSquareText, Star, X } from 'lucide-react';
import { Circle, CustomOverlayMap, Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

export type CompetitionReviewStats = {
    kakao?: {
        source?: string;
        placeUrl?: string;
        unavailableReason?: string;
    };
    naver?: {
        source?: string;
        query?: string;
        attemptedQueries?: string[];
        failedQueries?: string[];
        title?: string;
        rating?: number | null;
        visitorReviews?: number | null;
        blogReviews?: number | null;
        placeUrl?: string;
        rank?: number | null;
        unavailableReason?: string;
    };
    google?: {
        source?: string;
        placeId?: string;
        name?: string;
        rating?: number | null;
        userRatingCount?: number | null;
        placeUrl?: string;
        reviews?: Array<{
            authorName?: string;
            rating?: number | null;
            text?: string;
            relativeTimeDescription?: string;
        }>;
        unavailableReason?: string;
    };
};

export type CompetitionAdStats = {
    naver?: {
        provider?: string;
        query?: string;
        hasAds?: boolean;
        ads?: Array<{
            position?: number | null;
            title?: string;
            source?: string;
            link?: string;
        }>;
        competitorAdRank?: number | null;
        matchedTitle?: string;
        unavailableReason?: string;
    };
};

export type CompetitionPanelCompetitor = {
    id?: string;
    name: string;
    category?: string;
    address?: string;
    roadAddress?: string;
    phone?: string;
    distance?: number | null;
    placeUrl?: string;
    lat?: number | null;
    lng?: number | null;
    reviewStats?: CompetitionReviewStats;
    adStats?: CompetitionAdStats;
};

export type LocationCompetitionScan = {
    provider?: string;
    query?: string;
    radius?: number;
    scannedAt?: string;
    totalCount?: number;
    collectedCount?: number;
    competitors?: CompetitionPanelCompetitor[];
    coordinates?: {
        lat?: number | null;
        lng?: number | null;
    };
    reviewEnrichment?: {
        enabled?: boolean;
        limit?: number;
        naverConfigured?: boolean;
        googleConfigured?: boolean;
        kakaoReviewCountAvailable?: boolean;
        collectedAt?: string;
    };
    rankingPolicy?: {
        base?: string;
        distanceBucketMeters?: number;
        reviewSource?: string;
    };
    naverAdSnapshot?: {
        provider?: string;
        query?: string;
        attemptedQueries?: string[];
        failedQueries?: string[];
        enabled?: boolean;
        ads?: Array<{
            position?: number | null;
            title?: string;
            source?: string;
            link?: string;
        }>;
        unavailableReason?: string;
    };
};

type LocationCompetitionPanelProps = {
    locationName: string;
    address?: string;
    lat?: number | string | null;
    lng?: number | string | null;
    scan?: LocationCompetitionScan;
};

const KAKAO_JAVASCRIPT_KEY = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || '26c1197bae99e17f8c1f3e688e22914d';

function toNumber(value: unknown) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatDistance(value?: number | null) {
    if (value === null || value === undefined) return '-';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}km`;
    return `${Math.round(value).toLocaleString()}m`;
}

function formatCount(value?: number | null) {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString();
}

function getDisplayAddress(competitor: CompetitionPanelCompetitor) {
    return competitor.roadAddress || competitor.address || '';
}

function normalizeNaverPlaceUrl(value?: string) {
    const url = String(value || '').trim();
    if (!url) return '';

    const entryMatch = url.match(/map\.naver\.com\/p\/entry\/place\/(\d+)/i);
    if (entryMatch?.[1]) return `https://map.naver.com/p/entry/place/${entryMatch[1]}`;

    const directionsPlaceMatch = url.match(/,(\d+),PLACE_POI/i);
    if (directionsPlaceMatch?.[1]) return `https://map.naver.com/p/entry/place/${directionsPlaceMatch[1]}`;

    return url;
}

function getCenter(props: LocationCompetitionPanelProps) {
    const scanLat = toNumber(props.scan?.coordinates?.lat);
    const scanLng = toNumber(props.scan?.coordinates?.lng);
    const lat = scanLat ?? toNumber(props.lat);
    const lng = scanLng ?? toNumber(props.lng);
    if (lat === null || lng === null) return null;
    return { lat, lng };
}

function getCompetitorPosition(competitor: CompetitionPanelCompetitor) {
    const lat = toNumber(competitor.lat);
    const lng = toNumber(competitor.lng);
    if (lat === null || lng === null) return null;
    return { lat, lng };
}

function getDistanceBands(competitors: CompetitionPanelCompetitor[]) {
    return [
        { label: '100m', count: competitors.filter(item => (item.distance ?? Infinity) <= 100).length },
        { label: '300m', count: competitors.filter(item => (item.distance ?? Infinity) <= 300).length },
        { label: '700m', count: competitors.filter(item => (item.distance ?? Infinity) <= 700).length }
    ];
}

function renderNaverReview(competitor: CompetitionPanelCompetitor) {
    const naver = competitor.reviewStats?.naver;
    if (!naver) return <span>Naver 미연동</span>;
    if (naver.unavailableReason) return <span>Naver 미수집</span>;

    return (
        <>
            {naver.rating ? <span><Star size={11} /> Naver {naver.rating}</span> : null}
            <span>방문 {formatCount(naver.visitorReviews)}</span>
            <span>블로그 {formatCount(naver.blogReviews)}</span>
            {naver.visitorReviews === null && naver.blogReviews === null ? <span>Naver 리뷰값 없음</span> : null}
        </>
    );
}

function renderGoogleReview(competitor: CompetitionPanelCompetitor) {
    const google = competitor.reviewStats?.google;
    if (!google) return <span>Google 미연동</span>;
    if (google.unavailableReason) return <span>Google 미수집</span>;

    return (
        <>
            {google.rating ? <span><Star size={11} /> Google {google.rating}</span> : null}
            <span>리뷰 {formatCount(google.userRatingCount)}</span>
        </>
    );
}

function renderNaverAd(competitor: CompetitionPanelCompetitor) {
    const ad = competitor.adStats?.naver;
    if (!ad) return <span>검색광고 미연동</span>;
    if (ad.unavailableReason && !ad.hasAds) return <span>검색광고 미수집</span>;
    if (ad.competitorAdRank) return <span className={styles.locationAdRank}>검색광고 {ad.competitorAdRank}위</span>;
    return <span>검색광고 매칭 없음</span>;
}

function getNaverAdSummary(scan?: LocationCompetitionScan) {
    const snapshot = scan?.naverAdSnapshot;
    const adCount = snapshot?.ads?.length || 0;
    const attempted = snapshot?.attemptedQueries?.filter(Boolean) || [];
    const attemptedText = attempted.length > 0 ? `보조 검색어: ${attempted.join(' / ')}` : '';
    const failed = snapshot?.failedQueries?.filter(Boolean) || [];
    const failedText = failed.length > 0 ? `일부 실패: ${failed.join(' / ')}` : '';

    if (!snapshot) {
        return {
            label: '미수집',
            detail: 'SearchAPI 설정 후 경쟁스캔을 다시 실행하면 광고 결과가 저장됩니다.'
        };
    }
    if (snapshot.unavailableReason) {
        return {
            label: '수집오류',
            detail: snapshot.unavailableReason
        };
    }
    if (adCount > 0) {
        return {
            label: `${adCount}개`,
            detail: snapshot.query
                ? `SearchAPI 기준 "${snapshot.query}" 검색광고 영역에 노출된 업체입니다. 실제 브라우저 결과는 위치, 기기, 시간에 따라 달라질 수 있습니다.${failedText ? ` ${failedText}` : ''}`
                : `SearchAPI 기준 네이버 검색광고 영역에 노출된 업체입니다. 실제 브라우저 결과는 위치, 기기, 시간에 따라 달라질 수 있습니다.${failedText ? ` ${failedText}` : ''}`,
            debugDetail: attemptedText
        };
    }
    return {
        label: '미노출',
        detail: snapshot.query
            ? `SearchAPI 기준 "${snapshot.query}" 검색광고 영역에 노출된 업체가 없습니다. 실제 브라우저 결과는 위치, 기기, 시간에 따라 달라질 수 있습니다.${failedText ? ` ${failedText}` : ''}`
            : `SearchAPI 기준 네이버 검색광고 영역에 노출된 업체가 없습니다.${failedText ? ` ${failedText}` : ''}`,
        debugDetail: attemptedText
    };
}

function relayoutKakaoMap(map: kakao.maps.Map, center: { lat: number; lng: number }) {
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

export default function LocationCompetitionPanel(props: LocationCompetitionPanelProps) {
    const [isKakaoLoading, kakaoLoadError] = useKakaoLoader({
        appkey: KAKAO_JAVASCRIPT_KEY,
        libraries: ['services']
    });

    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [shouldRenderMap, setShouldRenderMap] = React.useState(false);
    const competitors = props.scan?.competitors || [];
    const center = getCenter(props);
    const mappableCompetitors = competitors
        .map(competitor => ({ competitor, position: getCompetitorPosition(competitor) }))
        .filter((item): item is { competitor: CompetitionPanelCompetitor; position: { lat: number; lng: number } } => Boolean(item.position))
        .slice(0, 12);
    const bands = getDistanceBands(competitors);
    const adSummary = getNaverAdSummary(props.scan);
    const summaryCount = props.scan?.totalCount || competitors.length;
    const reviewLimit = props.scan?.reviewEnrichment?.enabled ? props.scan.reviewEnrichment.limit || 0 : 0;
    const topCompetitors = competitors.slice(0, 3);
    const adItems = props.scan?.naverAdSnapshot?.ads || [];
    const listRankLabel = props.scan?.rankingPolicy?.base === 'distance-review' ? '거리+리뷰순' : '거리순';

    React.useEffect(() => {
        if (!isModalOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [isModalOpen]);

    React.useEffect(() => {
        if (!isModalOpen) {
            setShouldRenderMap(false);
            return;
        }

        const timer = window.setTimeout(() => setShouldRenderMap(true), 80);
        return () => window.clearTimeout(timer);
    }, [isModalOpen]);

    if (!props.scan && !center) {
        return (
            <div className={styles.locationCompetitionEmpty}>
                주소 저장 후 경쟁스캔을 실행하면 지도와 경쟁사 지표가 표시됩니다.
            </div>
        );
    }

    return (
        <div className={styles.locationCompetitionPanel}>
            <div
                className={styles.locationCompetitionSummary}
            >
                <div className={styles.locationCompetitionSummaryMain}>
                    <span><MapPin size={12} /> 경쟁 {formatCount(summaryCount)}곳</span>
                    <span title={adSummary.detail}><Megaphone size={12} /> 네이버 광고 {adSummary.label}</span>
                    <span><MessageSquareText size={12} /> 리뷰 상세 {reviewLimit ? `${reviewLimit}곳` : '미연동'}</span>
                </div>
                <button
                    type="button"
                    className={styles.locationCompetitionDetailButton}
                    onClick={() => setIsModalOpen(true)}
                >
                    <span>{formatDistance(props.scan?.radius || 700)}</span>
                    상세 보기
                </button>
            </div>

            {topCompetitors.length > 0 ? (
                <div className={styles.locationCompetitionPreview}>
                    {topCompetitors.map((competitor, index) => (
                        competitor.placeUrl ? (
                            <a
                                key={competitor.id || `${competitor.name}-${index}`}
                                href={competitor.placeUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {index + 1}. {competitor.name} · {formatDistance(competitor.distance)}
                            </a>
                        ) : (
                            <span key={competitor.id || `${competitor.name}-${index}`}>
                                {index + 1}. {competitor.name} · {formatDistance(competitor.distance)}
                            </span>
                        )
                    ))}
                </div>
            ) : null}

            {isModalOpen ? (
                <div
                    className={styles.locationCompetitionModalBackdrop}
                    role="presentation"
                    onMouseDown={() => setIsModalOpen(false)}
                >
                    <section
                        className={styles.locationCompetitionModal}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${props.locationName} 경쟁환경 상세`}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <header className={styles.locationCompetitionModalHeader}>
                            <div>
                                <h3>{props.locationName || '후보지'} 경쟁환경</h3>
                                <p>경쟁검색 {props.scan?.query || '키워드 미수집'} · {props.address || '주소 미입력'}</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} aria-label="닫기">
                                <X size={18} />
                            </button>
                        </header>

                        <div className={styles.locationCompetitionModalStats}>
                            <div>
                                <span>경쟁사</span>
                                <strong>{formatCount(summaryCount)}곳</strong>
                            </div>
                            <div>
                                <span>리뷰 상세</span>
                                <strong>{reviewLimit ? `${reviewLimit}곳` : '미연동'}</strong>
                            </div>
                            <div>
                                <span>네이버 광고</span>
                                <strong>{adSummary.label}</strong>
                            </div>
                            <div>
                                <span>반경</span>
                                <strong>{formatDistance(props.scan?.radius || 700)}</strong>
                            </div>
                        </div>

                        <div className={styles.locationCompetitionModalBody}>
                            <div className={styles.locationCompetitionModalMapColumn}>
                                <div className={styles.locationCompetitionModalMap}>
                                    {kakaoLoadError ? (
                                        <div className={styles.locationMapFallback}>Kakao 지도 도메인 설정 필요</div>
                                    ) : isKakaoLoading || !shouldRenderMap ? (
                                        <div className={styles.locationMapFallback}>지도 로딩 중</div>
                                    ) : center ? (
                                        <Map
                                            key={`${center.lat}-${center.lng}-${props.scan?.scannedAt || 'scan'}`}
                                            center={center}
                                            level={4}
                                            onCreate={(map) => relayoutKakaoMap(map, center)}
                                            style={{ width: '100%', height: '100%' }}
                                        >
                                            <Circle
                                                center={center}
                                                radius={props.scan?.radius || 700}
                                                strokeWeight={1}
                                                strokeColor="#2563eb"
                                                strokeOpacity={0.58}
                                                fillColor="#dbeafe"
                                                fillOpacity={0.18}
                                            />
                                            <MapMarker position={center} />
                                            <CustomOverlayMap position={center} yAnchor={1.6}>
                                                <div className={styles.locationMapLabel}>
                                                    <MapPin size={11} />
                                                    {props.locationName || '후보지'}
                                                </div>
                                            </CustomOverlayMap>
                                            {mappableCompetitors.map(({ competitor, position }, index) => (
                                                <React.Fragment key={competitor.id || `${competitor.name}-${index}`}>
                                                    <MapMarker position={position} />
                                                    <CustomOverlayMap position={position} yAnchor={1.9}>
                                                        <div className={styles.locationMapCompetitorLabel}>
                                                            {index + 1}
                                                        </div>
                                                    </CustomOverlayMap>
                                                </React.Fragment>
                                            ))}
                                        </Map>
                                    ) : (
                                        <div className={styles.locationMapFallback}>좌표 미수집</div>
                                    )}
                                </div>

                                <div className={styles.locationDistanceBands}>
                                    {bands.map(band => (
                                        <span key={band.label}>{band.label} 이내 <b>{band.count.toLocaleString()}</b></span>
                                    ))}
                                </div>

                                <div className={styles.locationAdList}>
                                    <strong>네이버 광고 영역</strong>
                                    <small>{adSummary.detail}</small>
                                    {adSummary.debugDetail ? <small title={adSummary.debugDetail}>검색 범위를 넓혀가며 확인했습니다.</small> : null}
                                    {adItems.length === 0 ? (
                                        <span>{props.scan?.naverAdSnapshot ? '수집된 광고가 없습니다.' : '경쟁스캔을 다시 실행하면 광고 결과가 저장됩니다.'}</span>
                                    ) : adItems.slice(0, 5).map(ad => (
                                        ad.link ? (
                                            <a key={`${ad.position}-${ad.title}`} href={ad.link} target="_blank" rel="noreferrer">
                                                {ad.position ? `광고 ${ad.position}위 · ` : ''}{ad.title}
                                            </a>
                                        ) : (
                                            <span key={`${ad.position}-${ad.title}`}>
                                                {ad.position ? `광고 ${ad.position}위 · ` : ''}{ad.title}
                                            </span>
                                        )
                                    ))}
                                </div>
                            </div>

                            <div className={styles.locationCompetitionModalListColumn}>
                                <div className={styles.locationCompetitionModalSectionHeader}>
                                    <h4>경쟁사 리스트</h4>
                                    <span>{listRankLabel} 상위 {Math.min(competitors.length, 8).toLocaleString()}곳</span>
                                </div>
                                {competitors.length === 0 ? (
                                    <div className={styles.locationCompetitionEmpty}>
                                        경쟁스캔 결과가 없습니다.
                                    </div>
                                ) : (
                                    <div className={styles.locationCompetitorList}>
                                        {competitors.slice(0, 8).map((competitor, index) => {
                                            const naverPlaceUrl = normalizeNaverPlaceUrl(competitor.reviewStats?.naver?.placeUrl);
                                            return (
                                                <article key={competitor.id || `${competitor.name}-${index}`} className={styles.locationCompetitorItem}>
                                                    <div className={styles.locationCompetitorHead}>
                                                        <div>
                                                            <strong>{index + 1}. {competitor.name}</strong>
                                                            <span>{formatDistance(competitor.distance)} · {competitor.category || '카테고리 없음'}</span>
                                                        </div>
                                                        <div className={styles.locationCompetitorLinks}>
                                                            {competitor.placeUrl ? (
                                                                <a href={competitor.placeUrl} target="_blank" rel="noreferrer" title="Kakao맵 매장 페이지">
                                                                    Kakao맵 <ExternalLink size={11} />
                                                                </a>
                                                            ) : null}
                                                            {naverPlaceUrl ? (
                                                                <a href={naverPlaceUrl} target="_blank" rel="noreferrer" title="Naver 플레이스">
                                                                    Naver <ExternalLink size={11} />
                                                                </a>
                                                            ) : null}
                                                            {competitor.reviewStats?.google?.placeUrl ? (
                                                                <a href={competitor.reviewStats.google.placeUrl} target="_blank" rel="noreferrer" title="Google 장소">
                                                                    Google <ExternalLink size={11} />
                                                                </a>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <small>{getDisplayAddress(competitor) || props.address || '주소 없음'}</small>
                                                    <div className={styles.locationReviewGrid}>
                                                        <div title={competitor.reviewStats?.naver?.query ? `Naver 리뷰 검색어: ${competitor.reviewStats.naver.query}` : undefined}>
                                                            <MessageSquareText size={12} />
                                                            {renderNaverReview(competitor)}
                                                        </div>
                                                        <div>
                                                            <MessageSquareText size={12} />
                                                            {renderGoogleReview(competitor)}
                                                        </div>
                                                        <div title="Kakao Local 공식 API는 리뷰 수와 리뷰 본문을 제공하지 않아 Kakao맵 매장 페이지만 연결합니다.">
                                                            <MessageSquareText size={12} />
                                                            <span>Kakao API 리뷰 미제공</span>
                                                            <span>Kakao맵에서 확인</span>
                                                        </div>
                                                        <div title="검색광고 순위는 수집 검색어의 SERP 광고 목록과 업체명이 매칭될 때만 표시합니다. 네이버 플레이스 광고 배지는 현재 자동 수집하지 않습니다.">
                                                            <Megaphone size={12} />
                                                            {renderNaverAd(competitor)}
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            ) : null}
        </div>
    );
}
