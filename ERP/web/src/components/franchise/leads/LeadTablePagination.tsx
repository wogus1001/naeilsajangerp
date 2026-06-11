"use client";

import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type LeadTablePaginationProps = {
    readonly visibleLeadCount: number;
    readonly pageRangeText: string;
    readonly safeCurrentPage: number;
    readonly totalPages: number;
    readonly onPreviousPage: () => void;
    readonly onNextPage: () => void;
};

export function LeadTablePagination({
    visibleLeadCount,
    pageRangeText,
    safeCurrentPage,
    totalPages,
    onPreviousPage,
    onNextPage
}: LeadTablePaginationProps) {
    if (visibleLeadCount === 0) return null;

    return (
        <div className={styles.paginationBar}>
            <span>{pageRangeText}</span>
            <div className={styles.paginationControls}>
                <button
                    type="button"
                    className={styles.paginationButton}
                    onClick={onPreviousPage}
                    disabled={safeCurrentPage <= 1}
                >
                    이전
                </button>
                <strong>{safeCurrentPage.toLocaleString()} / {totalPages.toLocaleString()}</strong>
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
