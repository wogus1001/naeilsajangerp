import { AlertTriangle, Building2, CheckCircle2, Store } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type OperationsSummaryProps = {
    readonly activeCount: number;
    readonly openingCount: number;
    readonly pausedCount: number;
    readonly scannedCount: number;
};

export function OperationsSummary({
    activeCount,
    openingCount,
    pausedCount,
    scannedCount
}: OperationsSummaryProps) {
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
                <CheckCircle2 size={18} />
                <span>경쟁스캔</span>
                <strong>{scannedCount.toLocaleString()}개</strong>
                <small>주변 경쟁업체 수집 완료</small>
            </article>
        </div>
    );
}
