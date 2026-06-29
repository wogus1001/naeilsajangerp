"use client";

import React from 'react';
import { FileSignature, Search } from 'lucide-react';
import type { ElectronicContractUsageSummary } from '@/lib/electronic-contracts/usage-summary';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import styles from './ElectronicContractUsagePanel.module.css';
import {
    filterAndSortUsage,
    pageItems,
    parseSortDirection,
    parseUsageFilter,
    parseUsageSortKey,
    type SortDirection,
    type UsageFilter,
    type UsageSortKey
} from './electronicContractUsageTableState';

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
    const [query, setQuery] = React.useState('');
    const [filter, setFilter] = React.useState<UsageFilter>('all');
    const [sortKey, setSortKey] = React.useState<UsageSortKey>('total');
    const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
    const [pageSize, setPageSize] = React.useState(10);
    const [page, setPage] = React.useState(1);

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

    React.useEffect(() => {
        setPage(1);
    }, [query, filter, sortKey, sortDirection, pageSize]);

    const filteredUsage = React.useMemo(() => filterAndSortUsage(usage, {
        query,
        filter,
        sortKey,
        sortDirection
    }), [filter, query, sortDirection, sortKey, usage]);
    const pageCount = Math.max(1, Math.ceil(filteredUsage.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const visibleUsage = pageItems(filteredUsage, currentPage, pageSize);

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
                    <div className={styles.toolbar}>
                        <label className={styles.searchBox}>
                            <Search size={16} />
                            <input
                                type="search"
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                                placeholder="회사명 또는 회사 ID 검색"
                            />
                        </label>
                        <select className={styles.control} value={filter} onChange={event => setFilter(parseUsageFilter(event.currentTarget.value))}>
                            <option value="all">전체 상태</option>
                            <option value="used">사용 있음</option>
                            <option value="zero">사용 없음</option>
                            <option value="in_progress">진행 있음</option>
                            <option value="completed">완료 있음</option>
                            <option value="failed_or_canceled">실패·취소 있음</option>
                        </select>
                        <select className={styles.control} value={sortKey} onChange={event => setSortKey(parseUsageSortKey(event.currentTarget.value))}>
                            <option value="total">전체 많은순</option>
                            <option value="companyName">회사명</option>
                            <option value="draft">초안</option>
                            <option value="inProgress">진행</option>
                            <option value="completed">완료</option>
                            <option value="failedOrCanceled">실패·취소</option>
                            <option value="recentSentAt">최근 발송</option>
                            <option value="recentCompletedAt">최근 완료</option>
                        </select>
                        <select className={styles.control} value={sortDirection} onChange={event => setSortDirection(parseSortDirection(event.currentTarget.value))}>
                            <option value="desc">내림차순</option>
                            <option value="asc">오름차순</option>
                        </select>
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
                                {visibleUsage.map(item => (
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
                                {!loading && filteredUsage.length === 0 && (
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
                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>
                            {filteredUsage.length.toLocaleString('ko-KR')}개 회사 중 {visibleUsage.length.toLocaleString('ko-KR')}개 표시
                        </div>
                        <div className={styles.pageControls}>
                            <select className={styles.pageSize} value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>
                                <option value={10}>10개씩</option>
                                <option value={20}>20개씩</option>
                                <option value={50}>50개씩</option>
                            </select>
                            <button type="button" className={styles.pageButton} onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                                이전
                            </button>
                            <span className={styles.pageNumber}>{currentPage} / {pageCount}</span>
                            <button type="button" className={styles.pageButton} onClick={() => setPage(prev => Math.min(pageCount, prev + 1))} disabled={currentPage === pageCount}>
                                다음
                            </button>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
