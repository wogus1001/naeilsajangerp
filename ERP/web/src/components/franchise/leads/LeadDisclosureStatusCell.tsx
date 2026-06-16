import type { LeadDisclosureSummary, LeadDisclosureSummaryState } from '@/lib/franchise-lead-disclosure-summary';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { formatDate } from './utils';

type LeadDisclosureStatusCellProps = {
    readonly summary?: LeadDisclosureSummary | null;
};

const EMPTY_DISCLOSURE_SUMMARY = {
    state: 'none',
    label: '미발송',
    latestDeliveryId: null,
    latestSentAt: null,
    latestDocumentTitle: '',
    latestDocumentVersion: '',
    latestSendStatus: null,
    recipientEmail: '',
    openedAt: null,
    confirmedAt: null,
    contractEligibleAt: null,
    remainingDays: null,
    waitDays: 14
} satisfies LeadDisclosureSummary;

const STATE_CLASS: Record<LeadDisclosureSummaryState, string> = {
    none: styles.disclosureBadgeMuted,
    pending: styles.disclosureBadgeWarning,
    failed: styles.disclosureBadgeDanger,
    sent: styles.disclosureBadgeInfo,
    opened: styles.disclosureBadgeInfo,
    confirmed: styles.disclosureBadgeSuccess,
    eligible: styles.disclosureBadgeSuccess
};

function getCaption(summary: LeadDisclosureSummary): string {
    if (summary.state === 'none') return '발송 필요';
    if (summary.state === 'failed') return '재발송 필요';
    if (summary.contractEligibleAt) return `가능일 ${formatDate(summary.contractEligibleAt)}`;
    if (summary.latestSentAt) return `${formatDate(summary.latestSentAt)} 발송`;
    return '이력 확인';
}

export function LeadDisclosureStatusCell({ summary }: LeadDisclosureStatusCellProps) {
    const effectiveSummary = summary ?? EMPTY_DISCLOSURE_SUMMARY;

    return (
        <span className={styles.disclosureStatusCell}>
            <span className={`${styles.disclosureBadge} ${STATE_CLASS[effectiveSummary.state]}`}>
                {effectiveSummary.label}
            </span>
            <small>{getCaption(effectiveSummary)}</small>
        </span>
    );
}
