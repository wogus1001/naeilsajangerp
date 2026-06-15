import React from 'react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { REALTY_SORT_OPTIONS, type RealtyFilterState, type RealtySortKey } from './scoring';
import { REALTY_PAGE_SIZE_OPTIONS } from './pagination-utils';

type Props = {
    readonly filters: RealtyFilterState;
    readonly pageSize: number;
    readonly shownCount: number;
    readonly totalCount: number;
    readonly onExpandAllAction: () => void;
    readonly onCollapseAllAction: () => void;
    readonly onToggleFilterAction: (key: keyof Pick<RealtyFilterState, 'favoriteOnly' | 'groundFloorOnly' | 'clearMaintenanceOnly'>) => void;
    readonly onSetSortKeyAction: (sortKey: RealtySortKey) => void;
    readonly onSetPageSizeAction: (pageSize: number) => void;
};

function parseSortKey(value: string): RealtySortKey {
    return REALTY_SORT_OPTIONS.find(option => option.key === value)?.key || 'score_desc';
}

export function RealtySavedListControls({
    filters,
    pageSize,
    shownCount,
    totalCount,
    onExpandAllAction,
    onCollapseAllAction,
    onToggleFilterAction,
    onSetSortKeyAction,
    onSetPageSizeAction
}: Props) {
    return (
        <>
            <div className={styles.realtySavedToolbar}>
                <div>
                    <button type="button" onClick={onExpandAllAction}>전체 열기</button>
                    <button type="button" onClick={onCollapseAllAction}>전체 닫기</button>
                </div>
                <span>{shownCount.toLocaleString()} / {totalCount.toLocaleString()}건 표시</span>
            </div>

            <div className={styles.realtySavedFilterBar}>
                <div>
                    <button type="button" className={filters.favoriteOnly ? styles.realtyFilterActive : ''} onClick={() => onToggleFilterAction('favoriteOnly')}>별표만</button>
                    <button type="button" className={filters.groundFloorOnly ? styles.realtyFilterActive : ''} onClick={() => onToggleFilterAction('groundFloorOnly')}>1층만</button>
                    <button type="button" className={filters.clearMaintenanceOnly ? styles.realtyFilterActive : ''} onClick={() => onToggleFilterAction('clearMaintenanceOnly')}>관리비 확인</button>
                </div>
                <div>
                    <label>
                        정렬
                        <select value={filters.sortKey} onChange={(event) => onSetSortKeyAction(parseSortKey(event.target.value))}>
                            {REALTY_SORT_OPTIONS.map(option => (
                                <option key={option.key} value={option.key}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        동별 페이지당
                        <select value={pageSize} onChange={(event) => onSetPageSizeAction(Number(event.target.value))}>
                            {REALTY_PAGE_SIZE_OPTIONS.map(size => (
                                <option key={size} value={size}>{size}건</option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>
        </>
    );
}
