"use client";

import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import {
    LOCATION_DEVELOPMENT_STAGES,
    LOCATION_IMPORTANCE_LEVELS
} from '@/lib/franchise-location-master';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { FRANCHISE_LOCATION_STATUSES, type LocationMasterFilters } from './locationMasterTypes';

type LocationMasterFiltersProps = {
    readonly filters: LocationMasterFilters;
    readonly filteredCount: number;
    readonly totalCount: number;
    readonly onChange: (patch: Partial<LocationMasterFilters>) => void;
    readonly onReset: () => void;
};

function isActive(value: string): boolean {
    return value.trim().length > 0;
}

function countActiveFilters(filters: LocationMasterFilters): number {
    return [
        filters.region,
        filters.importance,
        filters.status,
        filters.developmentStage,
        filters.maxAcquisitionCost,
        filters.maxDeposit,
        filters.maxPremium,
        filters.maxMonthlyRent,
        filters.maxMaintenanceFee
    ].filter(isActive).length;
}

function countAdvancedFilters(filters: LocationMasterFilters): number {
    return [
        filters.maxAcquisitionCost,
        filters.maxDeposit,
        filters.maxPremium,
        filters.maxMonthlyRent,
        filters.maxMaintenanceFee
    ].filter(isActive).length;
}

function getCompactFieldClassName(value: string): string {
    return isActive(value)
        ? `${styles.locationFilterCompactField} ${styles.locationFilterCompactFieldActive}`
        : styles.locationFilterCompactField;
}

export function LocationMasterFilters({
    filters,
    filteredCount,
    totalCount,
    onChange,
    onReset
}: LocationMasterFiltersProps) {
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const activeFilterCount = countActiveFilters(filters);
    const advancedFilterCount = countAdvancedFilters(filters);

    return (
        <div className={styles.locationFilterPanel}>
            <div className={styles.locationFilterCompactBar}>
                <div className={styles.locationFilterSummary}>
                    <strong>후보지 필터</strong>
                    <span>{filteredCount.toLocaleString()} / {totalCount.toLocaleString()}건</span>
                    {activeFilterCount > 0 ? <em>{activeFilterCount}개 적용</em> : null}
                </div>
                <label className={`${styles.locationFilterSearch} ${isActive(filters.region) ? styles.locationFilterSearchActive : ''}`}>
                    <Search size={15} aria-hidden="true" />
                    <input
                        aria-label="지역 검색"
                        value={filters.region}
                        onChange={(event) => onChange({ region: event.target.value })}
                        placeholder="지역 검색"
                    />
                </label>
                <label className={getCompactFieldClassName(filters.importance)}>
                    <span>중요도</span>
                    <select value={filters.importance} onChange={(event) => onChange({ importance: event.target.value })}>
                        <option value="">전체</option>
                        {LOCATION_IMPORTANCE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </label>
                <label className={getCompactFieldClassName(filters.status)}>
                    <span>진행상태</span>
                    <select value={filters.status} onChange={(event) => onChange({ status: event.target.value })}>
                        <option value="">전체</option>
                        {FRANCHISE_LOCATION_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                </label>
                <label className={getCompactFieldClassName(filters.developmentStage)}>
                    <span>개발상태</span>
                    <select value={filters.developmentStage} onChange={(event) => onChange({ developmentStage: event.target.value })}>
                        <option value="">전체</option>
                        {LOCATION_DEVELOPMENT_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                    </select>
                </label>
                <button
                    type="button"
                    className={isAdvancedOpen || advancedFilterCount > 0 ? styles.locationFilterToggleActive : styles.locationFilterToggle}
                    aria-expanded={isAdvancedOpen}
                    onClick={() => setIsAdvancedOpen(value => !value)}
                >
                    <SlidersHorizontal size={15} aria-hidden="true" />
                    비용 조건
                    {advancedFilterCount > 0 ? <span>{advancedFilterCount}</span> : null}
                </button>
                {activeFilterCount > 0 ? <button type="button" className={styles.weakButton} onClick={onReset}>초기화</button> : null}
            </div>
            {isAdvancedOpen ? (
                <div className={styles.locationFilterAdvancedGrid}>
                    <label className={isActive(filters.maxAcquisitionCost) ? styles.locationFilterActive : styles.locationFilterField}>
                        입점비용 이하
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={filters.maxAcquisitionCost} onChange={(event) => onChange({ maxAcquisitionCost: event.target.value })} placeholder="만원" />
                    </label>
                    <label className={isActive(filters.maxDeposit) ? styles.locationFilterActive : styles.locationFilterField}>
                        보증금 이하
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={filters.maxDeposit} onChange={(event) => onChange({ maxDeposit: event.target.value })} placeholder="만원" />
                    </label>
                    <label className={isActive(filters.maxPremium) ? styles.locationFilterActive : styles.locationFilterField}>
                        권리금 이하
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={filters.maxPremium} onChange={(event) => onChange({ maxPremium: event.target.value })} placeholder="만원" />
                    </label>
                    <label className={isActive(filters.maxMonthlyRent) ? styles.locationFilterActive : styles.locationFilterField}>
                        월세 이하
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={filters.maxMonthlyRent} onChange={(event) => onChange({ maxMonthlyRent: event.target.value })} placeholder="만원" />
                    </label>
                    <label className={isActive(filters.maxMaintenanceFee) ? styles.locationFilterActive : styles.locationFilterField}>
                        관리비 이하
                        <input className={styles.locationMoneyInput} inputMode="numeric" value={filters.maxMaintenanceFee} onChange={(event) => onChange({ maxMaintenanceFee: event.target.value })} placeholder="만원" />
                    </label>
                </div>
            ) : null}
        </div>
    );
}
