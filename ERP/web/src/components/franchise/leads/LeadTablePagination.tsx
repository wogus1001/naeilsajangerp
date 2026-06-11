"use client";

import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type LeadTablePaginationProps = {
    readonly visibleLeadCount: number;
    readonly safeCurrentPage: number;
    readonly totalPages: number;
    readonly onPreviousPage: () => void;
    readonly onNextPage: () => void;
};

export function LeadTablePagination({
    visibleLeadCount,
    safeCurrentPage,
    totalPages,
    onPreviousPage,
    onNextPage
}: LeadTablePaginationProps) {
    if (visibleLeadCount === 0) return null;

    return (
        <div className={styles.paginationBar}>
            <div className={styles.paginationControls}>
                <button
                    type="button"
                    className={styles.paginationButton}
                    onClick={onPreviousPage}
                    disabled={safeCurrentPage <= 1}
                >
                    이전
                </button>
                <strong>
                    <span>총 {visibleLeadCount.toLocaleString()}건</span>
                    {safeCurrentPage.toLocaleString()} / {totalPages.toLocaleString()}
                </strong>
                <button
                    type="button"
                    className={styles.paginationButton}
                    onClick={onNextPage}
                    disabled={safeCurrentPage >= totalPages}
                >
                    다음
                </button>
            </div>
        </div>
    );
}
