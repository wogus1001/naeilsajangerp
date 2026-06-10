import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import {
    filterRealtyListings,
    REALTY_SORT_OPTIONS,
    sortRealtyListings,
    type RealtyFilterState,
    type RealtySortKey
} from './scoring';
import type { RealtyImportedListing, RealtyListingRecord } from './types';
import { RealtyGroupPagination } from './RealtyGroupPagination';
import { RealtyListingRow } from './RealtyListingRow';
import { RealtySavedMap, type RealtyMapMarkerIndex } from './RealtySavedMap';
import { getRealtyListingMapKey } from './map-utils';
import { DEFAULT_REALTY_PAGE_SIZE, getPageItems, REALTY_PAGE_SIZE_OPTIONS } from './pagination-utils';
import { groupListings } from './utils';

type Props = {
    readonly listings: readonly RealtyImportedListing[];
    readonly isLoading: boolean;
    readonly favoriteUpdatingId: string;
    readonly onToggleFavoriteAction: (listing: RealtyListingRecord) => void;
};

export function RealtySavedListings({ listings, isLoading, favoriteUpdatingId, onToggleFavoriteAction }: Props) {
    const [expandedGroups, setExpandedGroups] = React.useState<ReadonlySet<string>>(() => new Set());
    const [activeMapGroupKey, setActiveMapGroupKey] = React.useState('');
    const [activeMapKeys, setActiveMapKeys] = React.useState<Readonly<Record<string, string>>>({});
    const [groupMapMarkers, setGroupMapMarkers] = React.useState<Readonly<Record<string, Readonly<Record<string, number>>>>>({});
    const [groupPages, setGroupPages] = React.useState<Readonly<Record<string, number>>>({});
    const [pageSize, setPageSize] = React.useState<number>(DEFAULT_REALTY_PAGE_SIZE);
    const [filters, setFilters] = React.useState<RealtyFilterState>({
        favoriteOnly: false,
        groundFloorOnly: false,
        clearMaintenanceOnly: false,
        sortKey: 'score_desc'
    });
    const filteredListings = React.useMemo(() => filterRealtyListings(listings, filters), [filters, listings]);
    const sortedListings = React.useMemo(() => sortRealtyListings(filteredListings, filters.sortKey), [filteredListings, filters.sortKey]);
    const groupedListings = React.useMemo(() => groupListings(sortedListings), [sortedListings]);

    React.useEffect(() => {
        setGroupPages({});
    }, [filters, listings, pageSize]);

    React.useEffect(() => {
        if (groupedListings.length === 0) return;
        setExpandedGroups(prev => {
            const availableKeys = new Set(groupedListings.map(group => group.key));
            const next = new Set([...prev].filter(key => availableKeys.has(key)));
            if (next.size === 0) next.add(groupedListings[0].key);
            return next;
        });
    }, [groupedListings]);

    React.useEffect(() => {
        if (groupedListings.length === 0) {
            setActiveMapGroupKey('');
            return;
        }
        const availableKeys = new Set(groupedListings.map(group => group.key));
        setActiveMapGroupKey(prev => {
            if (prev && availableKeys.has(prev) && expandedGroups.has(prev)) return prev;
            return [...expandedGroups].find(key => availableKeys.has(key)) || groupedListings[0]?.key || '';
        });
    }, [expandedGroups, groupedListings]);

    const toggleGroup = (key: string) => {
        const isCurrentlyExpanded = expandedGroups.has(key);
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (isCurrentlyExpanded) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
        if (!isCurrentlyExpanded) setActiveMapGroupKey(key);
    };

    const setAllGroupsExpanded = (expanded: boolean) => {
        setExpandedGroups(expanded ? new Set(groupedListings.map(group => group.key)) : new Set());
        setActiveMapGroupKey(expanded ? groupedListings[0]?.key || '' : '');
    };

    const setGroupPage = (key: string, page: number) => {
        setGroupPages(prev => ({ ...prev, [key]: page }));
    };

    const setGroupMapSelectedKey = React.useCallback((groupKey: string, markerKey: string) => {
        setActiveMapKeys(prev => {
            if (prev[groupKey] === markerKey) return prev;
            return {
                ...prev,
                [groupKey]: markerKey
            };
        });
    }, []);

    const setGroupMapMarkerIndex = React.useCallback((groupKey: string, markers: readonly RealtyMapMarkerIndex[]) => {
        setGroupMapMarkers(prev => {
            const nextMarkers = Object.fromEntries(markers.map(marker => [marker.key, marker.markerNumber]));
            const currentMarkers = prev[groupKey] || {};
            const sameSize = Object.keys(currentMarkers).length === Object.keys(nextMarkers).length;
            const isSame = sameSize && Object.entries(nextMarkers).every(([key, value]) => currentMarkers[key] === value);
            if (isSame) return prev;
            return {
                ...prev,
                [groupKey]: nextMarkers
            };
        });
    }, []);

    const toggleFilter = (key: keyof Pick<RealtyFilterState, 'favoriteOnly' | 'groundFloorOnly' | 'clearMaintenanceOnly'>) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const setSortKey = (sortKey: RealtySortKey) => {
        setFilters(prev => ({ ...prev, sortKey }));
    };

    return (
        <>
            <div className={styles.realtySavedToolbar}>
                <div>
                    <button type="button" onClick={() => setAllGroupsExpanded(true)}>전체 열기</button>
                    <button type="button" onClick={() => setAllGroupsExpanded(false)}>전체 닫기</button>
                </div>
                <span>{sortedListings.length.toLocaleString()} / {listings.length.toLocaleString()}건 표시</span>
            </div>

            <div className={styles.realtySavedFilterBar}>
                <div>
                    <button type="button" className={filters.favoriteOnly ? styles.realtyFilterActive : ''} onClick={() => toggleFilter('favoriteOnly')}>별표만</button>
                    <button type="button" className={filters.groundFloorOnly ? styles.realtyFilterActive : ''} onClick={() => toggleFilter('groundFloorOnly')}>1층만</button>
                    <button type="button" className={filters.clearMaintenanceOnly ? styles.realtyFilterActive : ''} onClick={() => toggleFilter('clearMaintenanceOnly')}>관리비 확인</button>
                </div>
                <div>
                    <label>
                        정렬
                        <select value={filters.sortKey} onChange={(event) => setSortKey(event.target.value as RealtySortKey)}>
                            {REALTY_SORT_OPTIONS.map(option => (
                                <option key={option.key} value={option.key}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        동별 페이지당
                        <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                            {REALTY_PAGE_SIZE_OPTIONS.map(size => (
                                <option key={size} value={size}>{size}건</option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>

            <div className={styles.realtyGroupList}>
                {listings.length === 0 ? (
                    <div className={styles.locationEmpty}>
                        {isLoading ? '저장된 상가를 불러오는 중입니다.' : '저장된 상가 매물이 없습니다. 상가 수집 실행 후 이 목록에 누적됩니다.'}
                    </div>
                ) : sortedListings.length === 0 ? (
                    <div className={styles.locationEmpty}>선택한 조건에 맞는 저장 상가가 없습니다.</div>
                ) : groupedListings.map(group => {
                    const expanded = expandedGroups.has(group.key);
                    const totalPages = Math.max(1, Math.ceil(group.listings.length / pageSize));
                    const currentPage = Math.min(groupPages[group.key] || 1, totalPages);
                    const pageItems = getPageItems(group.listings, currentPage, pageSize);
                    const start = (currentPage - 1) * pageSize + 1;
                    const end = Math.min(currentPage * pageSize, group.listings.length);
                    const mapScopeLabel = `${group.key} 현재 페이지 ${start.toLocaleString()}-${end.toLocaleString()} / ${group.listings.length.toLocaleString()}건`;
                    const activeMapKey = activeMapKeys[group.key] || '';
                    const mapMarkerNumbers = groupMapMarkers[group.key] || {};
                    return (
                        <article key={group.key} className={styles.realtyDistrictCard}>
                            <button type="button" className={styles.realtyDistrictHeader} onClick={() => toggleGroup(group.key)} aria-expanded={expanded}>
                                <span>{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                                <strong>{group.key}</strong>
                                <small>{group.listings.length.toLocaleString()}건</small>
                                {group.favoriteCount > 0 && <small>별표 {group.favoriteCount.toLocaleString()}건</small>}
                            </button>

                            {expanded && (
                                <>
                                    {activeMapGroupKey === group.key ? (
                                        <RealtySavedMap
                                            groupKey={group.key}
                                            listings={pageItems}
                                            title={`${group.key} 지도`}
                                            scopeLabel={mapScopeLabel}
                                            selectedKey={activeMapKey}
                                            onSelectKeyAction={setGroupMapSelectedKey}
                                            onMarkerIndexChangeAction={setGroupMapMarkerIndex}
                                        />
                                    ) : (
                                        <div className={styles.realtyDistrictMapAction}>
                                            <span>{group.key} 지도는 현재 페이지 매물 기준으로 표시됩니다.</span>
                                            <button type="button" onClick={() => setActiveMapGroupKey(group.key)}>이 동 지도 보기</button>
                                        </div>
                                    )}
                                    <div className={styles.realtyTableWrap}>
                                        <table className={styles.realtyTable}>
                                            <thead>
                                                <tr>
                                                    <th>별표</th>
                                                    <th>지도</th>
                                                    <th>점수</th>
                                                    <th>상태</th>
                                                    <th>주소</th>
                                                    <th>가격</th>
                                                    <th>저장일</th>
                                                    <th>세부</th>
                                                    <th>반응</th>
                                                    <th>원문</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pageItems.map(item => {
                                                    const mapKey = getRealtyListingMapKey(item.listing);
                                                    const mapMarkerNumber = mapKey ? mapMarkerNumbers[mapKey] : undefined;
                                                    return (
                                                        <RealtyListingRow
                                                            key={`${item.listing?.source || 'source'}-${item.listing?.id || item.listing?.sourceListingId}`}
                                                            item={item}
                                                            favoriteUpdatingId={favoriteUpdatingId}
                                                            mapMarkerNumber={mapMarkerNumber}
                                                            isMapMarkerSelected={Boolean(mapKey && activeMapKey === mapKey)}
                                                            onSelectMapMarkerAction={mapKey ? () => {
                                                                setActiveMapGroupKey(group.key);
                                                                setGroupMapSelectedKey(group.key, mapKey);
                                                            } : undefined}
                                                            onToggleFavoriteAction={onToggleFavoriteAction}
                                                        />
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {totalPages > 1 && (
                                        <RealtyGroupPagination
                                            currentPage={currentPage}
                                            pageSize={pageSize}
                                            totalCount={group.listings.length}
                                            totalPages={totalPages}
                                            onChangePage={(nextPage) => setGroupPage(group.key, nextPage)}
                                        />
                                    )}
                                </>
                            )}
                        </article>
                    );
                })}
            </div>
        </>
    );
}
