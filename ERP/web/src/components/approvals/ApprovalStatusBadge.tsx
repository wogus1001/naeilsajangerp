import { STATUS_LABELS, type ApprovalDocumentStatus } from './approvalTypes';
import styles from './ApprovalLists.module.css';

type ApprovalStatusBadgeProps = {
    readonly status: ApprovalDocumentStatus;
};

export function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
    return <span className={styles.statusBadge} data-status={status}>{STATUS_LABELS[status]}</span>;
}
