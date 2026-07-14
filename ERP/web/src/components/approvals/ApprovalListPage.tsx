'use client';

import React from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { ApprovalDocumentTable } from './ApprovalDocumentTable';
import { ApprovalPageHeader } from './ApprovalPageHeader';
import { STATUS_LABELS, type ApprovalDocumentStatus, type ApprovalInboxFilter } from './approvalTypes';
import { useApprovalInbox } from './useApprovalInbox';
import styles from './ApprovalLists.module.css';

type ApprovalListPageProps = {
    readonly description: string;
    readonly emptyMessage: string;
    readonly filter: ApprovalInboxFilter;
    readonly title: string;
};

export function ApprovalListPage({ description, emptyMessage, filter, title }: ApprovalListPageProps) {
    const [query, setQuery] = React.useState('');
    const [appliedQuery, setAppliedQuery] = React.useState('');
    const [status, setStatus] = React.useState<ApprovalDocumentStatus | 'all'>('all');
    const [from, setFrom] = React.useState('');
    const [to, setTo] = React.useState('');
    const { documents, error, loading, page, pageCount, setPage, total } = useApprovalInbox(filter, { query: appliedQuery, status, from, to });
    const filtered = Boolean(appliedQuery || status !== 'all' || from || to);

    React.useEffect(() => {
        const timer = window.setTimeout(() => setAppliedQuery(query.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [query]);

    function resetFilters() {
        setQuery('');
        setAppliedQuery('');
        setStatus('all');
        setFrom('');
        setTo('');
    }

    return (
        <section className={styles.page}>
            <ApprovalPageHeader description={description} title={title} />
            {error && <div className={styles.error} role="alert">{error}</div>}
            <div className={styles.panel}>
                <div className={styles.toolbar}>
                    <div className={styles.resultSummary}>
                        <strong>{loading ? '불러오는 중' : `${total.toLocaleString('ko-KR')}건`}</strong>
                        {filtered && !loading && <span>검색 조건에 맞는 문서</span>}
                    </div>
                    <div className={styles.filterControls}>
                        <label className={styles.search}>
                            <Search size={16} aria-hidden="true" />
                            <span className={styles.srOnly}>문서 검색</span>
                            <input
                                onChange={event => setQuery(event.target.value)}
                                placeholder="제목, 기안자, 부서, 양식, 문서번호 검색"
                                value={query}
                            />
                            {query && <button aria-label="검색어 지우기" onClick={() => { setQuery(''); setAppliedQuery(''); }} type="button"><X size={15} /></button>}
                        </label>
                        <select aria-label="문서 상태" onChange={event => setStatus(event.target.value as ApprovalDocumentStatus | 'all')} value={status}>
                            <option value="all">전체 상태</option>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <div className={styles.dateRange}>
                            <label><span className={styles.srOnly}>조회 시작일</span><input max={to || undefined} onChange={event => setFrom(event.target.value)} type="date" value={from} /></label>
                            <span aria-hidden="true">~</span>
                            <label><span className={styles.srOnly}>조회 종료일</span><input min={from || undefined} onChange={event => setTo(event.target.value)} type="date" value={to} /></label>
                        </div>
                        <button className={styles.resetButton} disabled={!filtered} onClick={resetFilters} type="button"><RotateCcw size={15} />초기화</button>
                    </div>
                </div>
                <ApprovalDocumentTable documents={documents} emptyMessage={filtered ? '검색 조건에 맞는 문서가 없습니다.' : emptyMessage} loading={loading} />
                {pageCount > 1 && (
                    <div className={styles.pagination}>
                        <button disabled={page === 1 || loading} onClick={() => setPage(page - 1)} type="button">이전</button>
                        <span>{page} / {pageCount}</span>
                        <button disabled={page === pageCount || loading} onClick={() => setPage(page + 1)} type="button">다음</button>
                    </div>
                )}
            </div>
        </section>
    );
}
