"use client";

import React from 'react';
import { FileSignature, RefreshCw } from 'lucide-react';
import type { ElectronicContractUsageSummary } from '@/lib/electronic-contracts/usage-summary';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import styles from './ElectronicContractUsagePanel.module.css';

type UsageResponse = {
    readonly data?: {
        readonly usage?: readonly ElectronicContractUsageSummary[];
    };
    readonly message?: string;
    readonly error?: string;
};

function formatDateTime(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function totalFor(usage: readonly ElectronicContractUsageSummary[], key: keyof Pick<ElectronicContractUsageSummary, 'total' | 'inProgress' | 'completed' | 'failed' | 'canceled'>): number {
    return usage.reduce((sum, item) => sum + item[key], 0);
}

async function fetchUsage(): Promise<readonly ElectronicContractUsageSummary[]> {
    const response = await fetch('/api/admin/electronic-contract-usage', {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const payload: UsageResponse = await response.json();
    if (!response.ok) throw new Error(payload.message || payload.error || '전자계약 사용량을 불러오지 못했습니다.');
    return payload.data?.usage || [];
}

export function ElectronicContractUsagePanel() {
    const [usage, setUsage] = React.useState<readonly ElectronicContractUsageSummary[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    const loadUsage = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setUsage(await fetchUsage());
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '전자계약 사용량을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadUsage();
    }, [loadUsage]);

    return (
        <section className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <span className={styles.titleIcon}><FileSignature size={18} /></span>
                    <div>
                        <h2 className={styles.title}>회사별 전자계약 사용량</h2>
                        <p className={styles.subtitle}>회사 기준 문서함 사용량과 최근 발송 현황을 확인합니다.</p>
                    </div>
                </div>
                <button className={styles.refreshButton} type="button" onClick={() => void loadUsage()} disabled={loading}>
                    <RefreshCw size={14} />
                    새로고침
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {!error && (
                <>
                    <div className={styles.summaryLine}>
                        <span className={styles.summaryChip}>전체 {totalFor(usage, 'total').toLocaleString('ko-KR')}건</span>
                        <span className={styles.summaryChip}>진행 {totalFor(usage, 'inProgress').toLocaleString('ko-KR')}건</span>
                        <span className={styles.summaryChip}>완료 {totalFor(usage, 'completed').toLocaleString('ko-KR')}건</span>
                        <span className={styles.summaryChip}>실패·취소 {(totalFor(usage, 'failed') + totalFor(usage, 'canceled')).toLocaleString('ko-KR')}건</span>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>회사</th>
                                    <th>전체</th>
                                    <th>초안</th>
                                    <th>진행</th>
                                    <th>완료</th>
                                    <th>실패·취소</th>
                                    <th>최근 발송</th>
                                    <th>최근 완료</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usage.map(item => (
                                    <tr key={item.companyId}>
                                        <td>
                                            <div className={styles.companyName}>{item.companyName}</div>
                                            <div className={styles.subtleText}>{item.companyId === 'unassigned' ? '회사 정보 없음' : item.companyId}</div>
                                        </td>
                                        <td className={styles.metric}>{item.total.toLocaleString('ko-KR')}</td>
                                        <td>{item.draft.toLocaleString('ko-KR')}</td>
                                        <td>{item.inProgress.toLocaleString('ko-KR')}</td>
                                        <td>{item.completed.toLocaleString('ko-KR')}</td>
                                        <td>{(item.failed + item.canceled).toLocaleString('ko-KR')}</td>
                                        <td>{formatDateTime(item.recentSentAt)}</td>
                                        <td>{formatDateTime(item.recentCompletedAt)}</td>
                                    </tr>
                                ))}
                                {!loading && usage.length === 0 && (
                                    <tr>
                                        <td className={styles.empty} colSpan={8}>전자계약 사용량이 없습니다.</td>
                                    </tr>
                                )}
                                {loading && (
                                    <tr>
                                        <td className={styles.empty} colSpan={8}>사용량을 불러오는 중입니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}
