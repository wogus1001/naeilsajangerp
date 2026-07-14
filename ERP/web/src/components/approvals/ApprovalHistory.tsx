import type { ApprovalEvent } from './approvalTypes';
import { ApprovalHistoryContent } from './ApprovalHistoryContent';
import styles from './ApprovalHistory.module.css';

type ApprovalHistoryProps = {
    readonly events: readonly ApprovalEvent[];
};

export function ApprovalHistory({ events }: ApprovalHistoryProps) {
    const classNames = {
        history: styles.history,
        summary: styles.summary,
        summaryTitle: styles.summaryTitle,
        count: styles.count,
        chevron: styles.chevron,
        timeline: styles.timeline,
        empty: styles.empty,
        event: styles.event,
        marker: styles.marker,
        eventBody: styles.eventBody,
        eventHeader: styles.eventHeader
    };
    return <ApprovalHistoryContent classNames={classNames} events={events} />;
}
