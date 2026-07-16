"use client";

import React from 'react';
import { RotateCcw, Search } from 'lucide-react';
import styles from './page.module.css';

export type WorkIntakeFilterState = {
    readonly search: string;
    readonly status: string;
    readonly from: string;
    readonly to: string;
};

type Props = {
    readonly filters: WorkIntakeFilterState;
    readonly onChangeAction: (filters: WorkIntakeFilterState) => void;
    readonly onResetAction: () => void;
};

const STATUS_OPTIONS = ['', '공실', '영업중', '신규', '검토중', '상담중', '계약가능', '보류'];

export function WorkIntakeFilters(props: Props) {
    const update = (patch: Partial<WorkIntakeFilterState>) => {
        props.onChangeAction({ ...props.filters, ...patch });
    };

    return (
        <section className={styles.filterBar} aria-label="진행현황 필터">
            <label className={styles.searchField}>
                <Search size={16} />
                <input
                    value={props.filters.search}
                    onChange={event => update({ search: event.currentTarget.value })}
                    placeholder="물건명, 주소, 이름, 연락처 검색"
                />
            </label>
            <select value={props.filters.status} onChange={event => update({ status: event.currentTarget.value })}>
                {STATUS_OPTIONS.map(status => (
                    <option key={status || 'all'} value={status}>{status || '전체 상태'}</option>
                ))}
            </select>
            <input
                type="date"
                value={props.filters.from}
                onChange={event => update({ from: event.currentTarget.value })}
                aria-label="시작일"
            />
            <input
                type="date"
                value={props.filters.to}
                onChange={event => update({ to: event.currentTarget.value })}
                aria-label="종료일"
            />
            <button type="button" className={styles.resetButton} onClick={props.onResetAction}>
                <RotateCcw size={14} /> 초기화
            </button>
        </section>
    );
}
