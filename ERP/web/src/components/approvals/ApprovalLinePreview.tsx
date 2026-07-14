import { Check, Circle, Users } from 'lucide-react';
import type { ApprovalLineStep, ApprovalTemplateStep } from './approvalTypes';
import styles from './ApprovalDocument.module.css';

type ApprovalLinePreviewProps =
    | { readonly kind: 'template'; readonly startOrder?: number; readonly steps: readonly ApprovalTemplateStep[] }
    | { readonly kind: 'document'; readonly steps: readonly ApprovalLineStep[] };

const ACTION_LABELS = {
    approval: '결재',
    agreement: '합의',
    acknowledgement: '수신 확인'
} as const;

const KIND_LABELS = {
    approval: '결재',
    agreement: '합의',
    reference: '참조',
    recipient: '수신'
} as const;

export function ApprovalLinePreview(props: ApprovalLinePreviewProps) {
    const hasSteps = props.steps.length > 0;
    return (
        <div className={styles.approvalLine}>
            <div className={styles.sectionHeading}>
                <span><Users size={18} aria-hidden="true" /><strong>결재선</strong></span>
                <small>{props.steps.length}단계</small>
            </div>
            {!hasSteps && <p className={styles.emptyLine}>이 양식에 등록된 결재선이 없습니다.</p>}
            {hasSteps && (
                <ol className={styles.lineSteps}>
                    {props.kind === 'template'
                        ? props.steps.map((step, index) => (
                            <li key={step.id}>
                                <span className={styles.stepMark}>{index + (props.startOrder ?? 1)}</span>
                                <div><strong>{step.label}</strong><small>{ACTION_LABELS[step.action]} · {step.targetLabel}</small></div>
                            </li>
                        ))
                        : props.steps.map(step => {
                            const complete = step.status !== 'waiting';
                            return (
                                <li key={step.id}>
                                    <span className={`${styles.stepMark} ${complete ? styles.stepComplete : ''}`}>
                                        {complete ? <Check size={14} aria-hidden="true" /> : <Circle size={10} aria-hidden="true" />}
                                    </span>
                                    <div><strong>{step.assigneeName}</strong><small>{KIND_LABELS[step.kind]} · {step.assigneeDepartment}</small></div>
                                    <span className={styles.stepStatus}>{complete ? '처리' : '대기'}</span>
                                </li>
                            );
                        })}
                </ol>
            )}
        </div>
    );
}
