import { ChevronDown, Clock3 } from 'lucide-react';
import type { ApprovalEvent } from './approvalTypes';

export type ApprovalHistoryClassNames = {
    readonly history: string;
    readonly summary: string;
    readonly summaryTitle: string;
    readonly count: string;
    readonly chevron: string;
    readonly timeline: string;
    readonly empty: string;
    readonly event: string;
    readonly marker: string;
    readonly eventBody: string;
    readonly eventHeader: string;
};

type ApprovalHistoryContentProps = {
    readonly events: readonly ApprovalEvent[];
    readonly classNames?: ApprovalHistoryClassNames;
};

const EMPTY_CLASS_NAMES: ApprovalHistoryClassNames = {
    history: '',
    summary: '',
    summaryTitle: '',
    count: '',
    chevron: '',
    timeline: '',
    empty: '',
    event: '',
    marker: '',
    eventBody: '',
    eventHeader: ''
};

function formatEventDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Seoul'
    }).format(date);
}

export function ApprovalHistoryContent({ events, classNames = EMPTY_CLASS_NAMES }: ApprovalHistoryContentProps) {
    return (
        <details className={classNames.history}>
            <summary className={classNames.summary}>
                <span className={classNames.summaryTitle}>
                    <Clock3 size={17} aria-hidden="true" />
                    처리 이력
                    <span className={classNames.count}>{events.length.toLocaleString('ko-KR')}건</span>
                </span>
                <ChevronDown className={classNames.chevron} size={18} aria-hidden="true" />
            </summary>
            <div className={classNames.timeline}>
                {events.length === 0 ? (
                    <p className={classNames.empty}>기록된 처리 이력이 없습니다.</p>
                ) : events.map(event => (
                    <div className={classNames.event} key={event.id}>
                        <span className={classNames.marker} aria-hidden="true" />
                        <div className={classNames.eventBody}>
                            <div className={classNames.eventHeader}>
                                <strong>{event.actorName}</strong>
                                <time dateTime={event.createdAt}>{formatEventDate(event.createdAt)}</time>
                            </div>
                            <p>{event.message}</p>
                        </div>
                    </div>
                ))}
            </div>
        </details>
    );
}
