"use client";

import type { Dispatch, SetStateAction } from 'react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { PAGE_SIZE_OPTIONS } from './constants';
import {
    EMPTY_LEAD_TABLE_FILTERS,
    LEAD_TABLE_COLUMNS,
    LEAD_TABLE_SORT_OPTIONS,
    hasActiveLeadTableFilters,
    toggleLeadTableColumn
} from './leadTableConfig';
import type { LeadTableColumnKey, LeadTableFilters, LeadTableSortKey } from './leadTableTypes';

type LeadTableControlsProps = {
    readonly pageSize: typeof PAGE_SIZE_OPTIONS[number];
    readonly filters: LeadTableFilters;
    readonly sort: LeadTableSortKey;
    readonly visibleColumns: readonly LeadTableColumnKey[];
    readonly onPageSizeChangeAction: (pageSize: typeof PAGE_SIZE_OPTIONS[number]) => void;
    readonly onFiltersChangeAction: Dispatch<SetStateAction<LeadTableFilters>>;
    readonly onSortChangeAction: (sort: LeadTableSortKey) => void;
    readonly onVisibleColumnsChangeAction: Dispatch<SetStateAction<readonly LeadTableColumnKey[]>>;
};

function parsePageSize(value: string): typeof PAGE_SIZE_OPTIONS[number] {
    const parsed = Number(value);
    return PAGE_SIZE_OPTIONS.find(option => option === parsed) ?? 50;
}

function parseSortKey(value: string): LeadTableSortKey {
    return LEAD_TABLE_SORT_OPTIONS.find(option => option.key === value)?.key ?? 'created_desc';
}

export function LeadTableControls({
    pageSize,
    filters,
    sort,
    visibleColumns,
    onPageSizeChangeAction,
    onFiltersChangeAction,
    onSortChangeAction,
    onVisibleColumnsChangeAction
}: LeadTableControlsProps) {
    const activeFilter = hasActiveLeadTableFilters(filters);
    const visibleColumnCount = LEAD_TABLE_COLUMNS.filter(column => visibleColumns.includes(column.key)).length;

    return (
        <div className={styles.tableControls}>
            <div className={styles.tableControlRow}>
                <label className={styles.pageSizeControl}>
                    표시
                    <select
                        value={pageSize}
                        onChange={(event) => onPageSizeChangeAction(parsePageSize(event.target.value))}
                    >
                        {PAGE_SIZE_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}건</option>
                        ))}
                    </select>
                </label>
                <details className={styles.columnPicker}>
                    <summary>표시 컬럼 {visibleColumnCount}개</summary>
                    <div className={styles.columnPickerPanel}>
                        {LEAD_TABLE_COLUMNS.map(column => {
                            const checked = visibleColumns.includes(column.key);
                            return (
                                <label key={column.key}>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={column.required}
                                        onChange={() => {
                                            onVisibleColumnsChangeAction(current => toggleLeadTableColumn(current, column.key));
                                        }}
                                    />
                                    {column.label}
                                </label>
                            );
                        })}
                    </div>
                </details>
            </div>

            <div className={styles.tableFilterBar}>
                <label>
                    정렬
                    <select
                        value={sort}
                        onChange={(event) => onSortChangeAction(parseSortKey(event.target.value))}
                    >
                        {LEAD_TABLE_SORT_OPTIONS.map(option => (
                            <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                    </select>
                </label>
                <label>
                    희망지역
                    <input
                        value={filters.regionQuery}
                        onChange={(event) => onFiltersChangeAction(prev => ({ ...prev, regionQuery: event.target.value }))}
                        placeholder="예: 강남구, 성남"
                    />
                </label>
                <label>
                    예산 최소
                    <input
                        value={filters.budgetMin}
                        onChange={(event) => onFiltersChangeAction(prev => ({ ...prev, budgetMin: event.target.value }))}
                        inputMode="numeric"
                        placeholder="만원"
                    />
                </label>
                <label>
                    예산 최대
                    <input
                        value={filters.budgetMax}
                        onChange={(event) => onFiltersChangeAction(prev => ({ ...prev, budgetMax: event.target.value }))}
                        inputMode="numeric"
                        placeholder="만원"
                    />
                </label>
                <button
                    type="button"
                    className={styles.filterResetButton}
                    onClick={() => onFiltersChangeAction(EMPTY_LEAD_TABLE_FILTERS)}
                    disabled={!activeFilter}
                >
                    초기화
                </button>
            </div>
        </div>
    );
}
