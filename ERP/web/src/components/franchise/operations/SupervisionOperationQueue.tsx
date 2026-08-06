'use client';

import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, ExternalLink } from 'lucide-react';
import type {
    SupervisionOperationQueueItem,
    SupervisionOperationQueueSeverity,
    SupervisionOperationQueueType
} from '@/lib/franchise-supervision-operation-queue';
import styles from './SupervisionPanel.module.css';

const QUEUE_TYPE_LABELS: Record<SupervisionOperationQueueType, string> = {
    visitToday: '오늘 방문',
    visitTomorrow: '내일 방문',
    reportMissing: '보고서 미제출',
    approvalPending: '승인 대기',
    actionOverdue: '시정 지연'
} as const;

const QUEUE_SEVERITY_CLASS_NAMES: Record<SupervisionOperationQueueSeverity, string> = {
    긴급: styles.queueBadgeUrgent,
    주의: styles.queueBadgeWarning,
    확인: styles.queueBadgeCheck
} as const;

function QueueTypeIcon({ type }: { readonly type: SupervisionOperationQueueType }) {
    if (type === 'visitToday' || type === 'visitTomorrow') return <CalendarClock size={15} aria-hidden="true" />;
    if (type === 'reportMissing') return <ClipboardList size={15} aria-hidden="true" />;
    if (type === 'actionOverdue') return <AlertTriangle size={15} aria-hidden="true" />;
    return <CheckCircle2 size={15} aria-hidden="true" />;
}

export function SupervisionOperationQueue(props: {
    readonly items: readonly SupervisionOperationQueueItem[];
    readonly onOpen: (item: SupervisionOperationQueueItem) => void;
}) {
    const visibleItems = props.items.slice(0, 8);
    return (
        <section className={styles.section} aria-label="슈퍼바이징 운영 우선순위">
            <div className={styles.sectionHeader}>
                <div>
                    <h3>운영 우선순위</h3>
                    <p>오늘 방문, 미제출 보고서, 승인 대기, 지연 시정요청을 처리 순서대로 봅니다.</p>
                </div>
                <span className={styles.queueCount}>{props.items.length.toLocaleString()}건</span>
            </div>
            <div className={styles.queueList}>
                {visibleItems.length === 0 ? (
                    <div className={styles.empty}>현재 바로 처리할 슈퍼바이징 항목이 없습니다.</div>
                ) : visibleItems.map(item => (
                    <button
                        key={item.id}
                        type="button"
                        className={styles.queueItem}
                        onClick={() => props.onOpen(item)}
                    >
                        <span className={styles.queueIcon}>
                            <QueueTypeIcon type={item.type} />
                        </span>
                        <span className={styles.queueText}>
                            <span className={styles.queueMeta}>
                                <span className={QUEUE_SEVERITY_CLASS_NAMES[item.severity]}>{item.severity}</span>
                                <span>{QUEUE_TYPE_LABELS[item.type]}</span>
                                <span>{item.dueDate || '날짜 미정'}</span>
                            </span>
                            <strong>{item.title}</strong>
                            <small>{item.description} · 담당 {item.ownerName}</small>
                        </span>
                        <ExternalLink size={14} aria-hidden="true" />
                    </button>
                ))}
            </div>
        </section>
    );
}
