import { AlertTriangle, Building2, MapPin, Store } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type OperationsSummaryProps = {
    readonly activeCount: number;
    readonly openingCount: number;
    readonly pausedCount: number;
    readonly addressedCount: number;
};

export function OperationsSummary({
    activeCount,
    openingCount,
    pausedCount,
    addressedCount
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
                <MapPin size={18} />
                <span>주소 등록</span>
                <strong>{addressedCount.toLocaleString()}개</strong>
                <small>지도화 가능한 주소 보유 매장</small>
            </article>
        </div>
    );
}
