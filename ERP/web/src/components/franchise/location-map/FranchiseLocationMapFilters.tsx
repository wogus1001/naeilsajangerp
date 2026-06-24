"use client";

import { Search } from 'lucide-react';
import {
    FRANCHISE_LOCATION_STATUSES,
    type FranchiseLocationStatus
} from '@/components/franchise/operations/types';
import {
    LOCATION_MAP_MODE_LABELS,
    LOCATION_MAP_STATUS_COLORS
} from './mapUtils';
import type {
    LocationMapCounts,
    LocationMapFilters,
    LocationMapMode
} from './types';
import styles from './FranchiseLocationMapService.module.css';

type Props = {
    readonly companyName: string;
    readonly counts: LocationMapCounts;
    readonly filters: LocationMapFilters;
    readonly onModeChange: (mode: LocationMapMode) => void;
    readonly onQueryChange: (query: string) => void;
    readonly onSelectAllStatuses: () => void;
    readonly onToggleStatus: (status: FranchiseLocationStatus) => void;
};

export function FranchiseLocationMapFilters({
    companyName,
    counts,
    filters,
    onModeChange,
    onQueryChange,
    onSelectAllStatuses,
    onToggleStatus
}: Props) {
    const allStatusSelected = FRANCHISE_LOCATION_STATUSES.every(status => filters.statuses.has(status));

    return (
        <header className={styles.mapHeader}>
            <div className={styles.mapTitleBlock}>
                <h1>물건지 지도</h1>
                <p>{companyName || '내일'}의 가맹 운영점과 출점 후보지를 지도에서 확인합니다.</p>
            </div>

            <div className={styles.mapToolbar} aria-label="물건지 지도 필터">
                <div className={styles.modeTabs} role="tablist" aria-label="물건지 보기">
                    {(Object.keys(LOCATION_MAP_MODE_LABELS) as LocationMapMode[]).map(mode => {
                        const isActive = filters.mode === mode;
                        const count = mode === 'operations'
                            ? counts.operation
                            : mode === 'candidates'
                                ? counts.candidate
                                : counts.total;
                        return (
                            <button
                                key={mode}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                className={isActive ? styles.modeTabActive : styles.modeTab}
                                onClick={() => onModeChange(mode)}
                            >
                                {LOCATION_MAP_MODE_LABELS[mode]}
                                <span>{count.toLocaleString()}</span>
                            </button>
                        );
                    })}
                </div>

                <div className={styles.filterSearchRow}>
                    <div className={styles.statusFilters} aria-label="상태 필터">
                        <button
                            type="button"
                            className={allStatusSelected ? styles.statusChipActive : styles.statusChip}
                            onClick={onSelectAllStatuses}
                        >
                            전체 상태
                        </button>
                        {FRANCHISE_LOCATION_STATUSES.map(status => {
                            const isActive = filters.statuses.has(status);
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    className={isActive ? styles.statusChipActive : styles.statusChip}
                                    onClick={() => onToggleStatus(status)}
                                >
                                    <span
                                        className={styles.statusDot}
                                        style={{ backgroundColor: LOCATION_MAP_STATUS_COLORS[status] }}
                                    />
                                    {status}
                                </button>
                            );
                        })}
                    </div>

                    <label className={styles.searchBox}>
                        <Search size={15} />
                        <input
                            value={filters.query}
                            onChange={(event) => onQueryChange(event.target.value)}
                            placeholder="가맹점명, 브랜드, 주소 검색"
                        />
                    </label>
                </div>
            </div>
        </header>
    );
}
