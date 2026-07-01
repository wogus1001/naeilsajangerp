"use client";

import { Search } from 'lucide-react';
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from './vendorContractsModel';
import styles from './vendorContracts.module.css';

type Props = {
    readonly category: string;
    readonly q: string;
    readonly status: string;
    readonly onCategoryChange: (value: string) => void;
    readonly onQueryChange: (value: string) => void;
    readonly onStatusChange: (value: string) => void;
};

export function VendorContractFilters({
    category,
    q,
    status,
    onCategoryChange,
    onQueryChange,
    onStatusChange
}: Props) {
    return (
        <section className={styles.panel}>
            <div className={styles.filterBar}>
                <label className={styles.searchBox}>
                    <Search size={16} />
                    <input value={q} onChange={event => onQueryChange(event.target.value)} placeholder="계약명, 업체명, 메모 검색" />
                </label>
                <select value={category} onChange={event => onCategoryChange(event.target.value)}>
                    <option value="all">전체 구분</option>
                    {CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select value={status} onChange={event => onStatusChange(event.target.value)}>
                    <option value="all">전체 상태</option>
                    {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
            </div>
        </section>
    );
}
