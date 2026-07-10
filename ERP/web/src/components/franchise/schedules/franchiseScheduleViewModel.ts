export type FranchiseScheduleStatus = '예정' | '진행중' | '완료' | '지연' | '취소';

export type FranchiseScheduleItem = {
    readonly id: string;
    readonly title: string;
    readonly date: string;
    readonly status: FranchiseScheduleStatus | string;
    readonly type?: string | null;
    readonly color?: string | null;
    readonly details?: string | null;
    readonly sourceType?: string | null;
    readonly sourceId?: string | null;
    readonly dueAt?: string | null;
    readonly remindAt?: string | null;
    readonly completedAt?: string | null;
    readonly createdAt?: string | null;
    readonly updatedAt?: string | null;
    readonly metadata?: Record<string, unknown>;
};

export type FranchiseScheduleFilter = 'all' | 'today' | 'week' | 'approval' | 'overdue' | 'manual';

export type FranchiseScheduleKpis = {
    readonly today: number;
    readonly week: number;
    readonly approval: number;
    readonly overdue: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const SOURCE_LABELS: Readonly<Record<string, string>> = {
    'approval-document': '결재',
    'supervision-visit': 'SV 방문',
    'inspection-report': '점검 보고',
    'corrective-action': '조치 업무',
    'manual-workflow': '수동 업무'
};

function localDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function todayKey(now = new Date()): string {
    return localDateKey(now);
}

export function addDaysKey(dateKey: string, days: number): string {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + days);
    return localDateKey(date);
}

export function formatKoreanDate(dateKey: string): string {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function monthBounds(monthKey: string): { readonly from: string; readonly to: string } {
    const [yearValue, monthValue] = monthKey.split('-').map(Number);
    const year = Number.isFinite(yearValue) ? yearValue : new Date().getFullYear();
    const month = Number.isFinite(monthValue) ? monthValue : new Date().getMonth() + 1;
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    return { from: localDateKey(first), to: localDateKey(last) };
}

export function monthGrid(monthKey: string): readonly string[] {
    const bounds = monthBounds(monthKey);
    const first = new Date(`${bounds.from}T00:00:00`);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
        const next = new Date(start);
        next.setDate(start.getDate() + index);
        return localDateKey(next);
    });
}

function isApprovalSchedule(item: FranchiseScheduleItem): boolean {
    return item.sourceType === 'approval-document'
        || item.type === 'approval'
        || String(item.metadata?.kind ?? '').includes('approval');
}

function isOverdue(item: FranchiseScheduleItem, baseDateKey: string): boolean {
    return item.status !== '완료' && item.status !== '취소' && item.date < baseDateKey;
}

export function isEditableManualSchedule(item: FranchiseScheduleItem): boolean {
    return !item.sourceType && !item.sourceId;
}

export function sourceLabelForSchedule(item: FranchiseScheduleItem): string {
    if (!item.sourceType) return '수동 일정';
    return SOURCE_LABELS[item.sourceType] ?? item.sourceType;
}

export function calculateFranchiseScheduleKpis(
    items: readonly FranchiseScheduleItem[],
    baseDateKey = todayKey()
): FranchiseScheduleKpis {
    const weekEndKey = addDaysKey(baseDateKey, 6);
    return {
        today: items.filter(item => item.date === baseDateKey && item.status !== '완료' && item.status !== '취소').length,
        week: items.filter(item => item.date >= baseDateKey && item.date <= weekEndKey && item.status !== '취소').length,
        approval: items.filter(item => isApprovalSchedule(item) && item.status !== '완료' && item.status !== '취소').length,
        overdue: items.filter(item => isOverdue(item, baseDateKey)).length
    };
}

export function filterFranchiseSchedules(
    items: readonly FranchiseScheduleItem[],
    filter: FranchiseScheduleFilter,
    baseDateKey = todayKey()
): readonly FranchiseScheduleItem[] {
    const weekEndKey = addDaysKey(baseDateKey, 6);
    return items.filter(item => {
        if (filter === 'today') return item.date === baseDateKey;
        if (filter === 'week') return item.date >= baseDateKey && item.date <= weekEndKey;
        if (filter === 'approval') return isApprovalSchedule(item);
        if (filter === 'overdue') return isOverdue(item, baseDateKey);
        if (filter === 'manual') return isEditableManualSchedule(item);
        return true;
    });
}

export function sortFranchiseSchedules(items: readonly FranchiseScheduleItem[]): readonly FranchiseScheduleItem[] {
    return [...items].sort((first, second) => {
        if (first.date !== second.date) return first.date.localeCompare(second.date);
        return (first.createdAt ?? '').localeCompare(second.createdAt ?? '');
    });
}

export function schedulesForDay(
    items: readonly FranchiseScheduleItem[],
    dateKey: string
): readonly FranchiseScheduleItem[] {
    return sortFranchiseSchedules(items.filter(item => item.date === dateKey));
}

export function paginateFranchiseSchedules<T>(
    items: readonly T[],
    page: number,
    pageSize: number
): { readonly pageItems: readonly T[]; readonly page: number; readonly pageCount: number } {
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(Math.max(page, 1), pageCount);
    return {
        page: safePage,
        pageCount,
        pageItems: items.slice((safePage - 1) * pageSize, safePage * pageSize)
    };
}

export function sourceDetailPath(item: FranchiseScheduleItem): string {
    if (item.sourceType === 'approval-document' && item.sourceId) {
        return `/dashboard/franchise-operations/schedule?approvalDocumentId=${encodeURIComponent(item.sourceId)}`;
    }
    if (item.sourceType === 'supervision-visit' || item.sourceType === 'inspection-report') {
        return '/dashboard/franchise-supervision';
    }
    if (item.sourceType === 'corrective-action') {
        return '/dashboard/franchise-operations/owner-portal';
    }
    return '/dashboard/franchise-operations/schedule';
}

const franchiseScheduleViewModel = {
    addDaysKey,
    calculateFranchiseScheduleKpis,
    filterFranchiseSchedules,
    formatKoreanDate,
    isEditableManualSchedule,
    monthBounds,
    monthGrid,
    paginateFranchiseSchedules,
    schedulesForDay,
    sortFranchiseSchedules,
    sourceDetailPath,
    sourceLabelForSchedule,
    todayKey
};

export default franchiseScheduleViewModel;
