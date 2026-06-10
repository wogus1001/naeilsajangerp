import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly currentPage: number;
    readonly pageSize: number;
    readonly totalCount: number;
    readonly totalPages: number;
    readonly onChangePage: (page: number) => void;
};

export function RealtyGroupPagination({ currentPage, pageSize, totalCount, totalPages, onChangePage }: Props) {
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalCount);

    return (
        <div className={styles.realtyPagination}>
            <span>
                {start.toLocaleString()} - {end.toLocaleString()} / {totalCount.toLocaleString()}건
            </span>
            <div>
                <button type="button" onClick={() => onChangePage(1)} disabled={currentPage <= 1}>처음</button>
                <button type="button" onClick={() => onChangePage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>이전</button>
                <strong>{currentPage.toLocaleString()} / {totalPages.toLocaleString()}</strong>
                <button type="button" onClick={() => onChangePage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>다음</button>
                <button type="button" onClick={() => onChangePage(totalPages)} disabled={currentPage >= totalPages}>마지막</button>
            </div>
        </div>
    );
}
