export const FRANCHISE_SCHEDULES_API_PATH = '/api/franchise-schedules';

export function getFranchiseScheduleMutationPath(
    method: 'POST' | 'PATCH' | 'DELETE',
    body: Readonly<Record<string, string>>
): string {
    const params = new URLSearchParams();
    if (method === 'DELETE' && body.id) params.set('id', body.id);
    if (method === 'PATCH' && body.action === 'complete') params.set('action', 'complete');
    const query = params.toString();
    return query ? `${FRANCHISE_SCHEDULES_API_PATH}?${query}` : FRANCHISE_SCHEDULES_API_PATH;
}

export type FranchiseScheduleStatus = '예정' | '진행중' | '완료' | '지연' | '취소';
export type FranchiseScheduleSource = 'manual' | 'approval-document' | 'supervision-visit' | 'report' | 'corrective-action';
export type FranchiseScheduleLoadState = 'loading' | 'empty' | 'ready' | 'needs-sql' | 'forbidden' | 'error';

export type FranchiseScheduleItem = {
    readonly id: string;
    readonly title: string;
    readonly date: string;
    readonly status: FranchiseScheduleStatus;
    readonly source: FranchiseScheduleSource;
    readonly assigneeName: string;
    readonly managerName: string;
    readonly details: string;
    readonly approvalDocumentId: string;
    readonly completedAt: string;
};

export type FranchiseScheduleFilters = {
    readonly status: 'all' | FranchiseScheduleStatus;
    readonly source: 'all' | FranchiseScheduleSource;
    readonly assignee: string;
};

export type FranchiseScheduleKpi = {
    readonly label: string;
    readonly value: number;
    readonly helper: string;
};

export type FranchiseScheduleViewModel = {
    readonly state: FranchiseScheduleLoadState;
    readonly monthLabel: string;
    readonly selectedDate: string;
    readonly filteredItems: readonly FranchiseScheduleItem[];
    readonly selectedItems: readonly FranchiseScheduleItem[];
    readonly kpis: readonly FranchiseScheduleKpi[];
    readonly focusId: string;
    readonly message: string;
};

const STATUS_SET: readonly FranchiseScheduleStatus[] = ['예정', '진행중', '완료', '지연', '취소'];
const SOURCE_SET: readonly FranchiseScheduleSource[] = ['manual', 'approval-document', 'supervision-visit', 'report', 'corrective-action'];

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeStatus(value: string): FranchiseScheduleStatus {
    for (const status of STATUS_SET) {
        if (value === status) return status;
    }
    if (value === 'completed' || value === 'done') return '완료';
    if (value === 'delayed' || value === 'overdue') return '지연';
    if (value === 'progress' || value === 'in_progress') return '진행중';
    if (value === 'cancelled' || value === 'canceled') return '취소';
    return '예정';
}

function normalizeSource(value: string): FranchiseScheduleSource {
    for (const source of SOURCE_SET) {
        if (value === source) return source;
    }
    return 'manual';
}

export function parseFranchiseScheduleItems(payload: unknown): readonly FranchiseScheduleItem[] {
    const source = Array.isArray(payload)
        ? payload
        : isRecord(payload) && Array.isArray(payload.schedules)
            ? payload.schedules
            : isRecord(payload) && Array.isArray(payload.data)
                ? payload.data
                : [];
    return source.flatMap((entry): readonly FranchiseScheduleItem[] => {
        if (!isRecord(entry)) return [];
        const id = readString(entry, 'id');
        const title = readString(entry, 'title');
        const date = readString(entry, 'date') || readString(entry, 'dueDate') || readString(entry, 'scheduledDate');
        if (!id || !title || !date) return [];
        return [{
            id,
            title,
            date,
            status: normalizeStatus(readString(entry, 'status')),
            source: normalizeSource(readString(entry, 'sourceType') || readString(entry, 'source')),
            assigneeName: readString(entry, 'assigneeName') || '담당자 미지정',
            managerName: readString(entry, 'managerName') || '관리자 미지정',
            details: readString(entry, 'details'),
            approvalDocumentId: readString(entry, 'approvalDocumentId'),
            completedAt: readString(entry, 'completedAt')
        }];
    }).sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));
}

export function getMonthDays(monthDate: Date): readonly string[] {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(year, month, 1 - firstDay.getDay());
    const days: string[] = [];
    for (let index = 0; index < 42; index += 1) {
        const day = new Date(start);
        day.setDate(start.getDate() + index);
        days.push(toDateKey(day));
    }
    return days;
}

export function toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function buildFranchiseScheduleViewModel(input: {
    readonly items: readonly FranchiseScheduleItem[];
    readonly filters: FranchiseScheduleFilters;
    readonly selectedDate: string;
    readonly monthDate: Date;
    readonly state: FranchiseScheduleLoadState;
    readonly approvalDocumentId?: string;
    readonly message?: string;
    readonly today?: string;
}): FranchiseScheduleViewModel {
    const today = input.today || toDateKey(new Date());
    const filteredItems = input.items.filter(item =>
        (input.filters.status === 'all' || item.status === input.filters.status) &&
        (input.filters.source === 'all' || item.source === input.filters.source) &&
        (!input.filters.assignee || item.assigneeName.includes(input.filters.assignee))
    );
    const focus = input.approvalDocumentId
        ? filteredItems.find(item => item.approvalDocumentId === input.approvalDocumentId)
        : undefined;
    const selectedDate = focus?.date || input.selectedDate;
    const selectedItems = filteredItems.filter(item => item.date === selectedDate);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndKey = toDateKey(weekEnd);
    const pendingApprovals = filteredItems.filter(item => item.source === 'approval-document' && item.status !== '완료').length;
    const overdue = filteredItems.filter(item => item.date < today && item.status !== '완료' && item.status !== '취소').length;
    const thisWeek = filteredItems.filter(item => item.date >= today && item.date <= weekEndKey && item.status !== '취소').length;
    const todayCount = filteredItems.filter(item => item.date === today && item.status !== '취소').length;

    return {
        state: input.items.length === 0 && input.state === 'ready' ? 'empty' : input.state,
        monthLabel: `${input.monthDate.getFullYear()}년 ${input.monthDate.getMonth() + 1}월`,
        selectedDate,
        filteredItems,
        selectedItems,
        kpis: [
            { label: '오늘 일정', value: todayCount, helper: '오늘 실행할 운영 일정' },
            { label: '승인 대기', value: pendingApprovals, helper: '결재 문서 기반 일정' },
            { label: '지연 일정', value: overdue, helper: '완료되지 않은 과거 일정' },
            { label: '이번 주', value: thisWeek, helper: '향후 7일 운영 큐' }
        ],
        focusId: focus?.id || '',
        message: input.message || ''
    };
}
