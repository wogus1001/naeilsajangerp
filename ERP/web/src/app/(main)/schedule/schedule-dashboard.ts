import { isFranchiseOperationsScheduleSource } from '@/lib/franchise-schedule-source-types';

export type ScheduleEvent = {
    readonly id: string;
    readonly title: string;
    readonly date: string;
    readonly scope?: string | null;
    readonly status?: string | null;
    readonly type?: string | null;
    readonly color?: string | null;
    readonly details?: string | null;
    readonly sourceType?: string | null;
    readonly sourceId?: string | null;
    readonly assigneeProfileId?: string | null;
    readonly managerProfileId?: string | null;
    readonly dueAt?: string | null;
    readonly completedAt?: string | null;
    readonly userName?: string | null;
    readonly customerId?: string | null;
    readonly propertyId?: string | null;
};

export type ScheduleDashboard = {
    readonly today: readonly ScheduleEvent[];
    readonly week: readonly ScheduleEvent[];
    readonly approvalPending: readonly ScheduleEvent[];
    readonly delayed: readonly ScheduleEvent[];
};

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function dateKey(value: unknown): string {
    const text = cleanText(value);
    if (!text) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(parsed);
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function keyFromDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function scheduleEventDateKey(event: ScheduleEvent): string {
    return dateKey(event.dueAt) || dateKey(event.date);
}

export function isScheduleEventDone(event: ScheduleEvent): boolean {
    const status = cleanText(event.status).toLowerCase();
    return status === '완료' || status === 'completed' || status === 'done' || Boolean(event.completedAt);
}

export function isScheduleEventCanceled(event: ScheduleEvent): boolean {
    const status = cleanText(event.status).toLowerCase();
    return status === '취소' || status === 'cancelled' || status === 'canceled';
}

export function isScheduleEventApprovalPending(event: ScheduleEvent): boolean {
    if (isScheduleEventDone(event) || isScheduleEventCanceled(event)) return false;
    const sourceType = cleanText(event.sourceType);
    const type = cleanText(event.type);
    const title = cleanText(event.title);
    return sourceType === 'approval-document' || type.includes('결재') || title.includes('결재');
}

export function buildScheduleDashboard(events: readonly ScheduleEvent[], today: Date = new Date()): ScheduleDashboard {
    const todayKey = keyFromDate(today);
    const weekEndKey = keyFromDate(addDays(today, 6));
    const activeEvents = events.filter(event => (
        !isScheduleEventCanceled(event)
        && !isFranchiseOperationsScheduleSource(event.sourceType)
    ));
    return {
        today: activeEvents.filter(event => scheduleEventDateKey(event) === todayKey),
        week: activeEvents.filter(event => {
            const key = scheduleEventDateKey(event);
            return key >= todayKey && key <= weekEndKey;
        }),
        approvalPending: activeEvents.filter(isScheduleEventApprovalPending),
        delayed: activeEvents.filter(event => {
            if (isScheduleEventDone(event)) return false;
            const key = scheduleEventDateKey(event);
            return Boolean(key) && key < todayKey;
        })
    };
}

export function sourceBadgeLabel(sourceType: string | null | undefined): string {
    switch (cleanText(sourceType)) {
        case 'supervision-visit':
            return 'SV 방문';
        case 'supervision-report':
            return 'SV 보고';
        case 'approval-document':
            return '결재';
        case 'owner-checklist':
            return '점주 체크';
        case 'owner-notice':
            return '공지';
        default:
            return '수동';
    }
}

export function scheduleEventHref(event: ScheduleEvent): string {
    const sourceId = cleanText(event.sourceId);
    return cleanText(event.sourceType) === 'approval-document' && sourceId
        ? `/approvals/documents/${encodeURIComponent(sourceId)}`
        : '';
}
