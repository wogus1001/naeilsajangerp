"use client";

import type { ReactNode } from 'react';
import { Search, SlidersHorizontal, UserRound, X } from 'lucide-react';
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
    readonly managerFilter: string;
    readonly managerOptions: ReactNode;
    readonly isMyManagerFilterActive: boolean;
    readonly canUseMyManagerFilter: boolean;
    readonly createdFrom: string;
    readonly createdTo: string;
    readonly onRangeClick: (range: string) => void;
    readonly onSearchTermChange: (term: string) => void;
    readonly onStatusFilterChange: (status: '전체' | FranchiseLeadStatus) => void;
    readonly onSourceFilterChange: (source: string) => void;
    readonly onManagerFilterChange: (managerId: string) => void;
    readonly onToggleMyLeadsOnly: () => void;
    readonly onCreatedFromChange: (date: string) => void;
    readonly onCreatedToChange: (date: string) => void;
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
    managerFilter,
    managerOptions,
    isMyManagerFilterActive,
    canUseMyManagerFilter,
    createdFrom,
    createdTo,
    onRangeClick,
    onSearchTermChange,
    onStatusFilterChange,
    onSourceFilterChange,
    onManagerFilterChange,
    onToggleMyLeadsOnly,
    onCreatedFromChange,
    onCreatedToChange
}: LeadToolbarProps) {
    return (
        <section className={styles.toolbar}>
            <div className={styles.rangeGroup} aria-label="기간 필터">
                {rangeOptions.map(option => (
                    <button
                        key={option}
                        className={range === option ? styles.rangeButtonActive : styles.rangeButton}
                        onClick={() => onRangeClick(option)}
                    >
                        {option}
                    </button>
                ))}
            </div>
            <div className={styles.searchBox}>
                <Search size={16} />
                <input
                    value={searchTerm}
                    onChange={(event) => onSearchTermChange(event.target.value)}
                    placeholder="이름, 연락처, 브랜드, 지역, 메모 검색"
                />
                {searchTerm && (
                    <button onClick={() => onSearchTermChange('')} aria-label="검색어 지우기">
                        <X size={14} />
                    </button>
                )}
            </div>
            <div className={styles.filterGroup}>
                <SlidersHorizontal size={16} />
                <select value={statusFilter} onChange={(event) => onStatusFilterChange(parseStatusFilter(event.target.value, statusOptions))}>
                    <option value="전체">전체 상태</option>
                    {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
                <select value={sourceFilter} onChange={(event) => onSourceFilterChange(event.target.value)}>
                    {sourceOptions.map(source => (
                        <option key={source} value={source}>{source === '전체' ? '전체 유입' : source}</option>
                    ))}
                </select>
                <select value={managerFilter} onChange={(event) => onManagerFilterChange(event.target.value)}>
                    <option value="전체">전체 담당자</option>
                    {managerOptions}
                </select>
                <button
                    type="button"
                    className={isMyManagerFilterActive ? styles.quickFilterButtonActive : styles.quickFilterButton}
                    onClick={onToggleMyLeadsOnly}
                    disabled={!canUseMyManagerFilter}
                >
                    <UserRound size={14} />
                    내 담당만
                </button>
                <input
                    type="date"
                    value={createdFrom}
                    onChange={(event) => onCreatedFromChange(event.target.value)}
                />
                <input
                    type="date"
                    value={createdTo}
                    onChange={(event) => onCreatedToChange(event.target.value)}
                />
            </div>
        </section>
    );
}
