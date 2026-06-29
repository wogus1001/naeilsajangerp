import { AlertTriangle, Building2, Gauge, Store } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type OperationsSummaryProps = {
    readonly activeCount: number;
    readonly openingCount: number;
    readonly pausedCount: number;
    readonly totalCount: number;
};

export function OperationsSummary({
    activeCount,
    openingCount,
    pausedCount,
    totalCount
}: OperationsSummaryProps) {
    const stabilityRate = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

    return (
        <div className={styles.marketSummaryCards}>
            <article>
                <Store size={18} />
                <span>운영중</span>
                <strong>{activeCount.toLocaleString()}개</strong>
                <small>현재 영업 중인 직영점/가맹점</small>
            </article>
            <article>
                <Building2 size={18} />
                <span>오픈준비</span>
                <strong>{openingCount.toLocaleString()}개</strong>
                <small>오픈 전 준비가 필요한 매장</small>
            </article>
            <article>
                <AlertTriangle size={18} />
                <span>운영주의</span>
                <strong>{pausedCount.toLocaleString()}개</strong>
                <small>휴점 상태로 확인이 필요한 매장</small>
            </article>
            <article>
                <Gauge size={18} />
                <span>운영 안정률</span>
                <strong>{stabilityRate.toLocaleString()}%</strong>
                <small>전체 운영점 중 운영중 비중</small>
            </article>
        </div>
    );
}
