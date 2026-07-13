'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { ApprovalDocumentTable } from './ApprovalDocumentTable';
import { ApprovalPageHeader } from './ApprovalPageHeader';
import type { ApprovalInboxFilter } from './approvalTypes';
import { useApprovalInbox } from './useApprovalInbox';
import styles from './ApprovalLists.module.css';

type ApprovalListPageProps = {
    readonly description: string;
    readonly emptyMessage: string;
    readonly filter: ApprovalInboxFilter;
    readonly title: string;
};

export function ApprovalListPage({ description, emptyMessage, filter, title }: ApprovalListPageProps) {
    const { documents, error, loading, page, pageCount, setPage, total } = useApprovalInbox(filter);
    const [query, setQuery] = React.useState('');
    const normalized = query.trim().toLocaleLowerCase('ko-KR');
    const visible = normalized
        ? documents.filter(document => `${document.title} ${document.authorName} ${document.documentNumber}`.toLocaleLowerCase('ko-KR').includes(normalized))
        : documents;

    return (
        <section className={styles.page}>
            <ApprovalPageHeader description={description} title={title} />
            {error && <div className={styles.error} role="alert">{error}</div>}
            <div className={styles.panel}>
                <div className={styles.toolbar}>
                    <strong>{loading ? '불러오는 중' : `${total.toLocaleString('ko-KR')}건`}</strong>
                    <label className={styles.search}>
                        <Search size={16} aria-hidden="true" />
                        <span className={styles.srOnly}>문서 검색</span>
                        <input
                            onChange={event => setQuery(event.target.value)}
                            placeholder="제목, 기안자, 문서번호 검색"
                            value={query}
                        />
                    </label>
                </div>
                <ApprovalDocumentTable documents={visible} emptyMessage={emptyMessage} loading={loading} />
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
