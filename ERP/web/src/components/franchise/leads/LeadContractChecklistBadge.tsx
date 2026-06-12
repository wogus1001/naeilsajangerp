import type { LeadContractChecklistSummaryView } from '@/lib/franchise-lead-contract-checklist';
import styles from './LeadContractChecklistBadge.module.css';

type LeadContractChecklistBadgeProps = {
    readonly summary?: LeadContractChecklistSummaryView;
};

const EMPTY_TOTAL = 7;

export function LeadContractChecklistBadge({ summary }: LeadContractChecklistBadgeProps) {
    const total = summary?.total || EMPTY_TOTAL;
    const completed = summary?.completed || 0;
    const remaining = summary?.remaining ?? total;
    const progressPercent = summary?.progressPercent || 0;
    const schemaReady = summary?.schemaReady !== false;
    const isComplete = schemaReady && total > 0 && remaining === 0;
    const metaText = !schemaReady
        ? 'SQL 적용 필요'
        : isComplete
            ? '계약 전 확인 완료'
            : summary?.remainingLabels[0] || `${remaining}개 남음`;

    return (
        <div className={isComplete ? `${styles.checkBadge} ${styles.checkBadgeComplete}` : styles.checkBadge}>
            <div className={styles.topRow}>
                <span className={styles.label}>계약 전 체크</span>
                <strong className={styles.count}>{completed}/{total}</strong>
            </div>
            <div className={styles.bar} aria-hidden="true">
                <div className={styles.barFill} style={{ width: `${progressPercent}%` }} />
            </div>
            <span className={styles.meta}>{metaText}</span>
        </div>
    );
}
