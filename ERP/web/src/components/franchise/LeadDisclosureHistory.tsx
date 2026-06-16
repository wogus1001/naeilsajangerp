"use client";

import type { FranchiseLeadDisclosureDelivery } from '@/lib/franchise-disclosure-deliveries';
import { CHANNEL_LABELS, formatDateTime } from './leadDisclosureFormUtils';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly deliveries: readonly FranchiseLeadDisclosureDelivery[];
};

const SEND_STATUS_LABELS: Record<FranchiseLeadDisclosureDelivery['sendStatus'], string> = {
    recorded: '기록됨',
    pending: '발송 대기',
    sent: '발송됨',
    failed: '실패'
};

export function LeadDisclosureHistory({ deliveries }: Props) {
    return (
        <div className={styles.disclosureHistory}>
            {deliveries.length === 0 ? (
                <div className={styles.locationMatchEmpty}>발송 이력이 없습니다.</div>
            ) : deliveries.map(delivery => (
                <article key={delivery.id} className={styles.disclosureHistoryItem}>
                    <div>
                        <strong>{delivery.documentTitle}</strong>
                        <span>
                            {delivery.documentVersion} · {CHANNEL_LABELS[delivery.channel]} · {SEND_STATUS_LABELS[delivery.sendStatus]} · {formatDateTime(delivery.sentAt)}
                        </span>
                        {delivery.openedAt ? <span>열람 추정 · {formatDateTime(delivery.openedAt)}</span> : null}
                        {delivery.confirmedAt ? <span>수령 확인 · {formatDateTime(delivery.confirmedAt)}</span> : null}
                        {delivery.sendError ? <span>오류 · {delivery.sendError}</span> : null}
                    </div>
                </article>
            ))}
        </div>
    );
}
