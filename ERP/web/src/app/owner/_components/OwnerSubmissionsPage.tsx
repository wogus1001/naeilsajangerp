"use client";

import React from 'react';
import styles from '../owner.module.css';
import {
    formatOwnerDate,
    OwnerPortalFrame,
    type OwnerSubmission,
    ownerStatusLabel,
    ownerSubmissionTypeLabel
} from './ownerPortalShared';

const OWNER_SUBMISSION_PAGE_SIZE = 5;

export function OwnerSubmissionsPage() {
    return (
        <OwnerPortalFrame activeKey="submissions">
            {data => <OwnerSubmissionsContent submissions={data.submissions} />}
        </OwnerPortalFrame>
    );
}

function OwnerSubmissionsContent({ submissions }: { readonly submissions: readonly OwnerSubmission[] }) {
    const [page, setPage] = React.useState(1);
    const pageCount = Math.max(1, Math.ceil(submissions.length / OWNER_SUBMISSION_PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const visibleSubmissions = submissions.slice(
        (currentPage - 1) * OWNER_SUBMISSION_PAGE_SIZE,
        currentPage * OWNER_SUBMISSION_PAGE_SIZE
    );

    React.useEffect(() => {
        setPage(currentPageValue => Math.min(currentPageValue, pageCount));
    }, [pageCount]);

    return (
        <section className={styles.panel}>
            <div className={styles.panelHeader}>
                <div>
                    <h1>제출 이력</h1>
                    <p>본사로 전달한 매장 정보, 체크리스트, 문의 상태입니다.</p>
                </div>
                <span className={styles.badge}>{submissions.length}건</span>
            </div>
            <div className={styles.panelBody}>
                {submissions.length === 0 ? <div className={styles.emptyState}>제출 이력이 없습니다.</div> : null}
                {submissions.length > 0 ? (
                    <>
                        <div className={styles.list}>
                            {visibleSubmissions.map(submission => (
                                <OwnerSubmissionListItem key={submission.id} submission={submission} />
                            ))}
                        </div>
                        <div className={styles.paginationBar}>
                            <span>총 {submissions.length}건</span>
                            <div className={styles.paginationControls}>
                                <button
                                    className={styles.paginationButton}
                                    type="button"
                                    disabled={currentPage <= 1}
                                    onClick={() => setPage(pageValue => Math.max(1, pageValue - 1))}
                                >
                                    이전
                                </button>
                                <strong>{currentPage} / {pageCount}</strong>
                                <button
                                    className={styles.paginationButton}
                                    type="button"
                                    disabled={currentPage >= pageCount}
                                    onClick={() => setPage(pageValue => Math.min(pageCount, pageValue + 1))}
                                >
                                    다음
                                </button>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </section>
    );
}

function OwnerSubmissionListItem({ submission }: { readonly submission: OwnerSubmission }) {
    const files = submission.files || [];
    return (
        <article className={styles.listItem}>
            <div className={styles.listItemHeader}>
                <div className={styles.checklistIssueTitle}>
                    <strong>{submission.title}</strong>
                    <span className={styles.itemMeta}>
                        {ownerSubmissionTypeLabel(submission.submission_type)} · {formatOwnerDate(submission.created_at)}
                    </span>
                </div>
                <span className={styles.badgeMuted}>{ownerStatusLabel(submission.status)}</span>
            </div>
            <details className={styles.checklistDetails}>
                <summary>제출 내용 확인</summary>
                <div className={styles.list}>
                    <p>{submission.body || '추가 내용이 없습니다.'}</p>
                    {submission.review_note ? <p>본사 메모: {submission.review_note}</p> : null}
                    {files.length > 0 ? <p>첨부 파일 {files.length}개</p> : null}
                </div>
            </details>
        </article>
    );
}
