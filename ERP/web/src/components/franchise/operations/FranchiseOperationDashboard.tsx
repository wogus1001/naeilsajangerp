'use client';

import { useState } from 'react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { getLocationRegion } from './format';
import {
    FRANCHISE_LOCATION_STATUSES,
    type FranchiseLocation
} from './types';

type StatusRow = {
    readonly status: string;
    readonly count: number;
};

type KoreaSidoRegion = {
    readonly key: string;
    readonly label: string;
    readonly aliases: readonly string[];
};

type RegionDistributionRow = {
    readonly key: string;
    readonly label: string;
    readonly count: number;
    readonly share: number;
    readonly statusRows: readonly StatusRow[];
};

type RegionDistribution = {
    readonly rows: readonly RegionDistributionRow[];
};

const REGION_PREVIEW_LIMIT = 5;

const KOREA_SIDO_REGIONS: readonly KoreaSidoRegion[] = [
    { key: 'seoul', label: '서울', aliases: ['서울', '서울특별시'] },
    { key: 'busan', label: '부산', aliases: ['부산', '부산광역시'] },
    { key: 'daegu', label: '대구', aliases: ['대구', '대구광역시'] },
    { key: 'incheon', label: '인천', aliases: ['인천', '인천광역시'] },
    { key: 'gwangju', label: '광주', aliases: ['광주', '광주광역시'] },
    { key: 'daejeon', label: '대전', aliases: ['대전', '대전광역시'] },
    { key: 'ulsan', label: '울산', aliases: ['울산', '울산광역시'] },
    { key: 'sejong', label: '세종', aliases: ['세종', '세종특별자치시'] },
    { key: 'gyeonggi', label: '경기', aliases: ['경기', '경기도'] },
    { key: 'gangwon', label: '강원', aliases: ['강원', '강원도', '강원특별자치도'] },
    { key: 'chungbuk', label: '충북', aliases: ['충북', '충청북도'] },
    { key: 'chungnam', label: '충남', aliases: ['충남', '충청남도'] },
    { key: 'jeonbuk', label: '전북', aliases: ['전북', '전라북도', '전북특별자치도'] },
    { key: 'jeonnam', label: '전남', aliases: ['전남', '전라남도'] },
    { key: 'gyeongbuk', label: '경북', aliases: ['경북', '경상북도'] },
    { key: 'gyeongnam', label: '경남', aliases: ['경남', '경상남도'] },
    { key: 'jeju', label: '제주', aliases: ['제주', '제주도', '제주특별자치도'] }
] as const;

type KoreaSidoKey = KoreaSidoRegion['key'];

export function FranchiseOperationDashboard({ locations }: { readonly locations: readonly FranchiseLocation[] }) {
    const [showAllRegions, setShowAllRegions] = useState(false);
    const statusRows = buildStatusRows(locations);
    const regionDistribution = buildRegionDistribution(locations);
    const maxStatusCount = Math.max(1, ...statusRows.map(row => row.count));
    const maxRegionCount = Math.max(1, ...regionDistribution.rows.map(row => row.count));
    const visibleRegionRows = showAllRegions ? regionDistribution.rows : regionDistribution.rows.slice(0, REGION_PREVIEW_LIMIT);
    const hiddenRegionCount = Math.max(0, regionDistribution.rows.length - REGION_PREVIEW_LIMIT);

    return (
        <div className={styles.operationDashboard}>
            <section className={styles.operationChartPanel}>
                <div className={styles.operationChartHeader}>
                    <div>
                        <h4>운영 상태 그래프</h4>
                        <p>운영중, 오픈준비, 휴점 상태를 한 화면에서 확인합니다.</p>
                    </div>
                    <span>{locations.length.toLocaleString()}개</span>
                </div>
                <div className={styles.operationBarList}>
                    {statusRows.length === 0 ? (
                        <div className={styles.operationDashboardEmpty}>등록된 가맹점이 없습니다.</div>
                    ) : statusRows.map(row => (
                        <div key={row.status} className={styles.operationBarRow}>
                            <span>{row.status}</span>
                            <div aria-hidden="true">
                                <i style={{ width: `${Math.max(8, (row.count / maxStatusCount) * 100)}%` }} />
                            </div>
                            <strong>{row.count.toLocaleString()}</strong>
                        </div>
                    ))}
                </div>
            </section>

            <section className={`${styles.operationChartPanel} ${styles.operationRegionPanel}`}>
                <div className={styles.operationChartHeader}>
                    <div>
                        <h4>지역별 운영 분포</h4>
                        <p>시도별 점포 수, 비중, 상태 구성을 함께 봅니다.</p>
                    </div>
                    <span>{regionDistribution.rows.length.toLocaleString()}개 지역</span>
                </div>
                <div className={styles.operationRegionInsights}>
                    {regionDistribution.rows.length === 0 ? (
                        <div className={styles.operationDashboardEmpty}>지역 기준으로 분류된 가맹점이 없습니다.</div>
                    ) : (
                        <div className={styles.operationRegionList}>
                            {visibleRegionRows.map((row, index) => (
                                <article key={row.key} className={styles.operationRegionRow}>
                                    <div className={styles.operationRegionName}>
                                        <span className={styles.operationRegionRank}>
                                            {index + 1}
                                        </span>
                                        <div>
                                            <strong>{row.label}</strong>
                                        </div>
                                    </div>
                                    <div className={styles.operationRegionMeasure}>
                                        <div className={styles.operationRegionValue}>
                                            <strong>{row.count.toLocaleString()}개</strong>
                                            <span>{formatPercent(row.share)}%</span>
                                        </div>
                                        <div className={styles.operationRegionTrack} aria-hidden="true">
                                            <i style={{ width: `${Math.max(6, (row.count / maxRegionCount) * 100)}%` }} />
                                        </div>
                                    </div>
                                    <div className={styles.operationRegionStatusBadges}>
                                        {row.statusRows.map(statusRow => (
                                            <span key={statusRow.status} className={getStatusBadgeClass(statusRow.status)}>
                                                {statusRow.status} {statusRow.count.toLocaleString()}
                                            </span>
                                        ))}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                    {hiddenRegionCount > 0 ? (
                        <button
                            type="button"
                            className={styles.operationRegionMoreButton}
                            onClick={() => setShowAllRegions(current => !current)}
                        >
                            {showAllRegions ? '접기' : `더보기 ${hiddenRegionCount.toLocaleString()}개`}
                        </button>
                    ) : null}
                </div>
            </section>
        </div>
    );
}

function buildStatusRows(locations: readonly FranchiseLocation[]): readonly StatusRow[] {
    return FRANCHISE_LOCATION_STATUSES.map(status => ({
        status,
        count: locations.filter(location => location.status === status).length
    })).filter(row => row.count > 0);
}

function buildRegionDistribution(locations: readonly FranchiseLocation[]): RegionDistribution {
    const buckets = new Map<KoreaSidoKey, { readonly region: KoreaSidoRegion; count: number; readonly statuses: Map<string, number> }>();

    KOREA_SIDO_REGIONS.forEach(region => {
        buckets.set(region.key, { region, count: 0, statuses: new Map() });
    });

    locations.forEach(location => {
        const key = resolveSidoKey(location);
        if (key === null) return;

        const bucket = buckets.get(key);
        if (!bucket) return;
        bucket.count += 1;
        incrementStatus(bucket.statuses, location.status);
    });

    const totalCount = locations.length;
    const regionRows = Array.from(buckets.values())
        .filter(bucket => bucket.count > 0)
        .sort((a, b) => b.count - a.count || a.region.label.localeCompare(b.region.label, 'ko-KR'));
    const rows: RegionDistributionRow[] = regionRows.map(bucket => makeRegionRow({
        key: bucket.region.key,
        label: bucket.region.label,
        count: bucket.count,
        statuses: bucket.statuses,
        totalCount
    }));

    return { rows };
}

function makeRegionRow({
    key,
    label,
    count,
    statuses,
    totalCount,
}: {
    readonly key: string;
    readonly label: string;
    readonly count: number;
    readonly statuses: ReadonlyMap<string, number>;
    readonly totalCount: number;
}): RegionDistributionRow {
    return {
        key,
        label,
        count,
        share: getRatio(count, totalCount),
        statusRows: FRANCHISE_LOCATION_STATUSES.map(status => ({
            status,
            count: statuses.get(status) || 0
        })).filter(row => row.count > 0),
    };
}

function incrementStatus(statuses: Map<string, number>, status: string) {
    statuses.set(status, (statuses.get(status) || 0) + 1);
}

function resolveSidoKey(location: FranchiseLocation): KoreaSidoKey | null {
    const source = `${location.region} ${location.address} ${getLocationRegion(location)}`.trim();
    if (!source) return null;

    for (const region of KOREA_SIDO_REGIONS) {
        if (region.aliases.some(alias => source.includes(alias))) {
            return region.key;
        }
    }
    return null;
}

function getRatio(value: number, total: number) {
    if (total <= 0) return 0;
    return (value / total) * 100;
}

function formatPercent(value: number) {
    if (value > 0 && value < 1) return '<1';
    return Math.round(value).toLocaleString();
}

function getStatusBadgeClass(status: string) {
    if (status === '운영중') return styles.operationRegionStatusActive;
    if (status === '오픈준비') return styles.operationRegionStatusOpening;
    if (status === '검토중') return styles.operationRegionStatusReview;
    if (status === '휴점') return styles.operationRegionStatusPaused;
    if (status === '폐점') return styles.operationRegionStatusClosed;
    return styles.operationRegionStatusMuted;
}
