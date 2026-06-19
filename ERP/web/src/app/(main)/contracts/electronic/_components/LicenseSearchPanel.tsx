"use client";

import React from 'react';
import { Search } from 'lucide-react';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import styles from './electronicContracts.module.css';

export type LicenseBusinessResult = {
    readonly id: string;
    readonly licenseNumber: string;
    readonly businessName: string;
    readonly businessType: string;
    readonly address: string;
    readonly permissionDate: string;
    readonly similarityBadges: readonly string[];
};

type SearchResponse = {
    readonly data?: {
        readonly records?: readonly LicenseBusinessResult[];
    };
};

export function LicenseSearchPanel({
    requesterId,
    businessName,
    propertyAddress,
    onPick
}: {
    readonly requesterId: string;
    readonly businessName: string;
    readonly propertyAddress: string;
    readonly onPick: (record: LicenseBusinessResult) => void;
}) {
    const [query, setQuery] = React.useState('');
    const [records, setRecords] = React.useState<readonly LicenseBusinessResult[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    async function searchRecords() {
        if (!requesterId) {
            setError('로그인 정보를 확인하지 못했습니다.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({
                q: query || businessName || propertyAddress,
                businessName,
                address: propertyAddress,
                limit: '8'
            });
            const response = await fetch(`/api/license-businesses/search?${params.toString()}`, {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            const payload: SearchResponse = await response.json();
            if (!response.ok) throw new Error('인허가번호 후보를 불러오지 못했습니다.');
            setRecords(payload.data?.records || []);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '인허가번호 후보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className={styles.formSection}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>인허가번호 조회</h2>
                <span className={styles.helperText}>선택한 후보는 계약서 영업허가번호에 반영됩니다.</span>
            </div>
            <div className={styles.searchRow}>
                <input value={query} placeholder="상호명, 주소, 허가번호 검색" onChange={event => setQuery(event.target.value)} />
                <button type="button" className={styles.secondaryButton} onClick={searchRecords} disabled={loading}>
                    <Search size={16} />
                    {loading ? '조회 중' : '조회'}
                </button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.resultGrid}>
                {records.map(record => (
                    <button key={record.id} type="button" className={styles.resultCard} onClick={() => onPick(record)}>
                        <strong>{record.businessName || '-'}</strong>
                        <span>{record.licenseNumber || '-'}</span>
                        <small>{record.businessType || '-'} · {record.address || '-'}</small>
                        {record.similarityBadges.length > 0 && (
                            <em>{record.similarityBadges.join(' · ')}</em>
                        )}
                    </button>
                ))}
            </div>
        </section>
    );
}
