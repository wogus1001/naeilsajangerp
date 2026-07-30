"use client";

import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { getFranchiseLeadSourceLabel } from '@/lib/franchise-leads';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type LeadToolbarProps = {
    readonly rangeOptions: readonly string[];
    readonly range: string;
    readonly searchTerm: string;
    readonly statusFilter: '전체' | FranchiseLeadStatus;
    readonly statusOptions: readonly FranchiseLeadStatus[];
    readonly sourceFilter: string;
    readonly sourceOptions: readonly string[];
    readonly sourceLabelMap?: Readonly<Record<string, string>>;
    readonly managerFilter: string;
    readonly managerOptions: ReactNode;
    readonly createdFrom: string;
    readonly createdTo: string;
    readonly onRangeClickAction: (range: string) => void;
    readonly onSearchTermChangeAction: (term: string) => void;
    readonly onStatusFilterChangeAction: (status: '전체' | FranchiseLeadStatus) => void;
    readonly onSourceFilterChangeAction: (source: string) => void;
    readonly onManagerFilterChangeAction: (managerId: string) => void;
    readonly onCreatedFromChangeAction: (date: string) => void;
    readonly onCreatedToChangeAction: (date: string) => void;
};

function parseStatusFilter(value: string, statuses: readonly FranchiseLeadStatus[]) {
    if (value === '전체') return '전체';
    return statuses.find(status => status === value) || '전체';
}

export function LeadToolbar({
    rangeOptions,
    range,
    searchTerm,
    statusFilter,
    statusOptions,
    sourceFilter,
    sourceOptions,
    sourceLabelMap = {},
    managerFilter,
    managerOptions,
    createdFrom,
    createdTo,
    onRangeClickAction,
    onSearchTermChangeAction,
    onStatusFilterChangeAction,
    onSourceFilterChangeAction,
    onManagerFilterChangeAction,
    onCreatedFromChangeAction,
    onCreatedToChangeAction
}: LeadToolbarProps) {
    const isSearchActive = searchTerm.trim().length > 0;
    const isCustomDateRangeActive = range === '전체' && (createdFrom.length > 0 || createdTo.length > 0);

    return (
        <section className={styles.toolbar}>
            <div className={styles.rangeGroup} aria-label="기간 필터">
                {rangeOptions.map(option => (
                    <button
                        key={option}
                        className={range === option ? styles.rangeButtonActive : styles.rangeButton}
                        onClick={() => onRangeClickAction(option)}
                    >
                        {option}
                    </button>
                ))}
            </div>
            <div className={`${styles.searchBox} ${isSearchActive ? styles.toolbarControlActive : ''}`}>
                <Search size={16} />
                <input
                    value={searchTerm}
                    onChange={(event) => onSearchTermChangeAction(event.target.value)}
                    placeholder="이름, 연락처, 브랜드, 지역, 메모 검색"
                />
                {searchTerm && (
                    <button onClick={() => onSearchTermChangeAction('')} aria-label="검색어 지우기">
                        <X size={14} />
                    </button>
                )}
            </div>
            <div className={styles.filterGroup}>
                <select
                    className={statusFilter !== '전체' ? styles.toolbarControlActive : undefined}
                    value={statusFilter}
                    onChange={(event) => onStatusFilterChangeAction(parseStatusFilter(event.target.value, statusOptions))}
                >
                    <option value="전체">전체 상태</option>
                    {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
                <select
                    className={sourceFilter !== '전체' ? styles.toolbarControlActive : undefined}
                    value={sourceFilter}
                    onChange={(event) => onSourceFilterChangeAction(event.target.value)}
                >
                    {sourceOptions.map(source => (
                        <option key={source} value={source}>
                            {source === '전체' ? '전체 유입' : sourceLabelMap[source] || getFranchiseLeadSourceLabel(source)}
                        </option>
                    ))}
                </select>
                <select
                    className={managerFilter !== '전체' ? styles.toolbarControlActive : undefined}
                    value={managerFilter}
                    onChange={(event) => onManagerFilterChangeAction(event.target.value)}
                >
                    <option value="전체">전체 담당자</option>
                    {managerOptions}
                </select>
                <div className={styles.dateRangeGroup} aria-label="등록일 기간">
                    <input
                        className={isCustomDateRangeActive ? styles.toolbarControlActive : undefined}
                        type="date"
                        value={createdFrom}
                        onChange={(event) => onCreatedFromChangeAction(event.target.value)}
                        aria-label="등록 시작일"
                    />
                    <span aria-hidden="true">~</span>
                    <input
                        className={isCustomDateRangeActive ? styles.toolbarControlActive : undefined}
                        type="date"
                        value={createdTo}
                        onChange={(event) => onCreatedToChangeAction(event.target.value)}
                        aria-label="등록 종료일"
                    />
                </div>
            </div>
        </section>
    );
}
