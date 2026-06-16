"use client";

import { useMemo, useState } from 'react';
import type { MarketInsight } from '@/lib/franchise-market-insights';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

const ALL_REGIONS_VALUE = '__all_regions__';
const ALL_DISTRICTS_VALUE = '__all_districts__';
const MARKET_INSIGHT_PAGE_SIZE = 10;

type MarketInsightOverviewProps = {
    readonly marketInsights: readonly MarketInsight[];
    readonly onSelectRegion: (region: string) => void;
};

function getRegionParts(region: string) {
    const [sido, ...districtParts] = region.split(' ').filter(Boolean);
    return {
        sido: sido || '지역 미지정',
        district: districtParts.join(' ')
    };
}

export function MarketInsightOverview({
    marketInsights,
    onSelectRegion
}: MarketInsightOverviewProps) {
    const [sidoFilter, setSidoFilter] = useState(ALL_REGIONS_VALUE);
    const [districtFilter, setDistrictFilter] = useState(ALL_DISTRICTS_VALUE);
    const [page, setPage] = useState(1);

    const regionOptions = useMemo(() => (
        marketInsights.map(item => ({
            region: item.region,
            ...getRegionParts(item.region)
        }))
    ), [marketInsights]);
    const sidoOptions = useMemo(
        () => Array.from(new Set(regionOptions.map(item => item.sido))),
        [regionOptions]
    );
    const selectedSido = sidoOptions.includes(sidoFilter) ? sidoFilter : ALL_REGIONS_VALUE;
    const districtOptions = useMemo(
        () => selectedSido === ALL_REGIONS_VALUE
            ? []
            : Array.from(new Set(regionOptions
                .filter(item => item.sido === selectedSido)
                .map(item => item.district)
                .filter(Boolean))),
        [regionOptions, selectedSido]
    );
    const selectedDistrict = districtOptions.includes(districtFilter)
        ? districtFilter
        : ALL_DISTRICTS_VALUE;
    const filteredRegions = useMemo(
        () => new Set(regionOptions
            .filter(item => selectedSido === ALL_REGIONS_VALUE || item.sido === selectedSido)
            .filter(item => selectedDistrict === ALL_DISTRICTS_VALUE || item.district === selectedDistrict)
            .map(item => item.region)),
        [regionOptions, selectedDistrict, selectedSido]
    );
    const filteredInsights = useMemo(
        () => marketInsights.filter(item => filteredRegions.has(item.region)),
        [filteredRegions, marketInsights]
    );
    const isDistrictDisabled = selectedSido === ALL_REGIONS_VALUE || districtOptions.length === 0;
    const districtSelectValue = isDistrictDisabled ? ALL_DISTRICTS_VALUE : selectedDistrict;
    const selectedSidoLabel = selectedSido === ALL_REGIONS_VALUE ? '전체 시도' : selectedSido;
    const activeFilterLabel = selectedDistrict === ALL_DISTRICTS_VALUE
        ? selectedSidoLabel
        : `${selectedSidoLabel} ${selectedDistrict}`;
    const pageCount = Math.max(1, Math.ceil(filteredInsights.length / MARKET_INSIGHT_PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageStartIndex = (currentPage - 1) * MARKET_INSIGHT_PAGE_SIZE;
    const pageEndIndex = Math.min(pageStartIndex + MARKET_INSIGHT_PAGE_SIZE, filteredInsights.length);
    const pagedInsights = filteredInsights.slice(pageStartIndex, pageEndIndex);

    const handleSidoChange = (value: string) => {
        setSidoFilter(value);
        setDistrictFilter(ALL_DISTRICTS_VALUE);
        setPage(1);
    };
    const handleDistrictChange = (value: string) => {
        setDistrictFilter(value);
        setPage(1);
    };

    return (
        <>
            {marketInsights.length === 0 ? (
                <div className={styles.marketEmpty}>
                    희망지역이 있는 후보자나 주소가 있는 출점 후보지가 쌓이면 지역별 인사이트가 표시됩니다.
                </div>
            ) : (
                <>
                    <div className={styles.marketInsightToolbar}>
                        <div className={styles.marketInsightMeta}>
                            {activeFilterLabel} · 총 <strong>{filteredInsights.length.toLocaleString()}</strong>개 지역
                        </div>
                        <div className={styles.marketInsightFilters}>
                            <label className={styles.marketInsightFilter}>
                                <span>시도</span>
                                <select
                                    value={selectedSido}
                                    onChange={(event) => handleSidoChange(event.currentTarget.value)}
                                >
                                    <option value={ALL_REGIONS_VALUE}>전체 시도</option>
                                    {sidoOptions.map(sido => (
                                        <option key={sido} value={sido}>{sido}</option>
                                    ))}
                                </select>
                            </label>
                            <label className={styles.marketInsightFilter}>
                                <span>시군구</span>
                                <select
                                    value={districtSelectValue}
                                    onChange={(event) => handleDistrictChange(event.currentTarget.value)}
                                    disabled={isDistrictDisabled}
                                >
                                    <option value={ALL_DISTRICTS_VALUE}>
                                        {selectedSido === ALL_REGIONS_VALUE ? '시도 선택 후 전체' : '전체 시군구'}
                                    </option>
                                    {districtOptions.map(district => (
                                        <option key={district} value={district}>{district}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>
                    <div className={styles.marketInsightTableWrap}>
                        <table className={styles.marketInsightTable}>
                            <thead>
                                <tr>
                                    <th>지역</th>
                                    <th>후보자 수</th>
                                    <th>상담 우선</th>
                                    <th>계약 진행</th>
                                    <th>보유 후보지</th>
                                    <th>연결 완료</th>
                                    <th>연결 필요</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedInsights.map(item => (
                                    <tr
                                        key={item.region}
                                        aria-label={`${item.region} 지역 필터로 후보지 목록 열기`}
                                        tabIndex={0}
                                        onClick={() => onSelectRegion(item.region)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') onSelectRegion(item.region);
                                        }}
                                    >
                                        <td>
                                            <strong>{item.region}</strong>
                                        </td>
                                        <td>{item.leadCount.toLocaleString()}</td>
                                        <td>{item.hotCount.toLocaleString()}</td>
                                        <td>{item.contractCount.toLocaleString()}</td>
                                        <td>{item.propertyCount.toLocaleString()}</td>
                                        <td><div className={styles.scorePill}>{item.linkedLeadCount.toLocaleString()}</div></td>
                                        <td>
                                            <div className={item.matchingNeededCount > 0 ? styles.scorePillWarn : styles.scorePill}>
                                                {item.matchingNeededCount.toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className={styles.paginationBar}>
                            <div className={styles.paginationControls}>
                                <button
                                    type="button"
                                    className={styles.paginationButton}
                                    disabled={currentPage <= 1}
                                    onClick={() => setPage(currentPage - 1)}
                                >
                                    이전
                                </button>
                                <strong>
                                    <span>{pageStartIndex + 1}-{pageEndIndex} / {filteredInsights.length.toLocaleString()}</span>
                                    {currentPage} / {pageCount}
                                </strong>
                                <button
                                    type="button"
                                    className={styles.paginationButton}
                                    disabled={currentPage >= pageCount}
                                    onClick={() => setPage(currentPage + 1)}
                                >
                                    다음
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
