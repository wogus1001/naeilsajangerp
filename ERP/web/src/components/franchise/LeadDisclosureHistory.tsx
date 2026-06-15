"use client";

import type { FranchiseLeadDisclosureDelivery } from '@/lib/franchise-disclosure-deliveries';
import { CHANNEL_LABELS, formatDateTime } from './leadDisclosureFormUtils';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly deliveries: readonly FranchiseLeadDisclosureDelivery[];
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
                        <span>{delivery.documentVersion} · {CHANNEL_LABELS[delivery.channel]} · {formatDateTime(delivery.sentAt)}</span>
                    </div>
                </article>
            ))}
        </div>
    );
}
