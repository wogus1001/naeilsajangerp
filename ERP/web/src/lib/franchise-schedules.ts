export const FRANCHISE_SCHEDULE_STATUSES = ['예정', '진행중', '완료', '지연', '취소'] as const;
export type FranchiseScheduleStatus = (typeof FRANCHISE_SCHEDULE_STATUSES)[number];

export const FRANCHISE_SCHEDULE_SOURCE_TYPES = [
    'approval-document',
    'supervision-visit',
    'inspection-report',
    'corrective-action',
    'manual-workflow'
] as const;
export type FranchiseScheduleSourceType = (typeof FRANCHISE_SCHEDULE_SOURCE_TYPES)[number];

export type FranchiseScheduleSource = {
    readonly sourceType: FranchiseScheduleSourceType;
    readonly sourceId: string;
};

export type FranchiseScheduleInput = {
    readonly title: string;
    readonly date?: string | null;
    readonly dueAt?: string | null;
    readonly status?: string | null;
    readonly sourceType?: string | null;
    readonly sourceId?: string | null;
};

export type FranchiseScheduleValidation =
    | { readonly ok: true; readonly value: NormalizedFranchiseScheduleInput }
    | { readonly ok: false; readonly reason: FranchiseScheduleValidationReason; readonly message: string };

export type FranchiseScheduleValidationReason =
    | 'invalid_title'
    | 'invalid_date'
    | 'invalid_status'
    | 'partial_source'
    | 'invalid_source';

export type NormalizedFranchiseScheduleInput = {
    readonly title: string;
    readonly date: string;
    readonly status: FranchiseScheduleStatus;
    readonly source: FranchiseScheduleSource | null;
};

export type FranchiseScheduleClass = {
    readonly isToday: boolean;
    readonly isThisWeek: boolean;
    readonly isOverdue: boolean;
    readonly needsApproval: boolean;
};

const SOURCE_BADGES: Record<FranchiseScheduleSourceType, string> = {
    'approval-document': '결재',
    'supervision-visit': '슈퍼바이징',
    'inspection-report': '보고서',
    'corrective-action': '시정조치',
    'manual-workflow': '수동복구'
};

const LEGACY_STATUS_MAP: ReadonlyMap<string, FranchiseScheduleStatus> = new Map([
    ['scheduled', '예정'],
    ['pending', '예정'],
    ['예정', '예정'],
    ['progress', '진행중'],
    ['in_progress', '진행중'],
    ['ongoing', '진행중'],
    ['진행중', '진행중'],
    ['승인대기', '진행중'],
    ['보고서대기', '진행중'],
    ['completed', '완료'],
    ['done', '완료'],
    ['완료', '완료'],
    ['delayed', '지연'],
    ['overdue', '지연'],
    ['지연', '지연'],
    ['cancelled', '취소'],
    ['canceled', '취소'],
    ['취소', '취소']
]);

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function kstDateKey(value: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(value);
}

export function dateKeyFromFranchiseScheduleValue(value: unknown): string | null {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : kstDateKey(value);
    const text = cleanText(value);
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : kstDateKey(parsed);
}

export function normalizeFranchiseScheduleStatus(value: unknown): FranchiseScheduleStatus | null {
    const normalized = cleanText(value).toLowerCase();
    return LEGACY_STATUS_MAP.get(normalized) ?? null;
}

export function isTerminalFranchiseScheduleStatus(status: FranchiseScheduleStatus): boolean {
    return status === '완료' || status === '취소';
}

export function isFranchiseScheduleSourceType(value: string): value is FranchiseScheduleSourceType {
    return FRANCHISE_SCHEDULE_SOURCE_TYPES.some(sourceType => sourceType === value);
}

export function parseFranchiseScheduleSource(input: FranchiseScheduleInput): FranchiseScheduleSource | null | FranchiseScheduleValidation {
    const sourceType = cleanText(input.sourceType);
    const sourceId = cleanText(input.sourceId);
    if (!sourceType && !sourceId) return null;
    if (!sourceType || !sourceId) {
        return { ok: false, reason: 'partial_source', message: 'sourceType and sourceId must be provided together.' };
    }
    if (!isFranchiseScheduleSourceType(sourceType)) {
        return { ok: false, reason: 'invalid_source', message: 'Unsupported franchise schedule source type.' };
    }
    return { sourceType, sourceId };
}

export function validateFranchiseScheduleInput(input: FranchiseScheduleInput): FranchiseScheduleValidation {
    const title = cleanText(input.title);
    if (!title) return { ok: false, reason: 'invalid_title', message: 'Title is required.' };
    const date = dateKeyFromFranchiseScheduleValue(input.date) ?? dateKeyFromFranchiseScheduleValue(input.dueAt);
    if (!date) return { ok: false, reason: 'invalid_date', message: 'Valid date or dueAt is required.' };
    const status = normalizeFranchiseScheduleStatus(input.status ?? '예정');
    if (!status) return { ok: false, reason: 'invalid_status', message: 'Unsupported franchise schedule status.' };
    const source = parseFranchiseScheduleSource(input);
    if (source && 'ok' in source) return source;
    return { ok: true, value: { title, date, status, source } };
}

export function canEditFranchiseScheduleSource(input: FranchiseScheduleSource | null): boolean {
    return input === null;
}

export function sourceBadgeForFranchiseSchedule(input: FranchiseScheduleSource | null): string {
    return input ? SOURCE_BADGES[input.sourceType] : '수동';
}

export function classifyFranchiseSchedule(input: {
    readonly date: string;
    readonly dueAt?: string | null;
    readonly status: FranchiseScheduleStatus;
    readonly source: FranchiseScheduleSource | null;
    readonly now?: Date;
}): FranchiseScheduleClass {
    const nowKey = kstDateKey(input.now ?? new Date());
    const targetKey = dateKeyFromFranchiseScheduleValue(input.dueAt) ?? input.date;
    const inWeek = targetKey >= nowKey && targetKey <= addDaysKey(nowKey, 6);
    return {
        isToday: targetKey === nowKey,
        isThisWeek: inWeek,
        isOverdue: targetKey < nowKey && !isTerminalFranchiseScheduleStatus(input.status),
        needsApproval: input.source?.sourceType === 'approval-document' && input.status !== '완료' && input.status !== '취소'
    };
}

function addDaysKey(dateKey: string, days: number): string {
    const parsed = new Date(`${dateKey}T00:00:00.000+09:00`);
    parsed.setUTCDate(parsed.getUTCDate() + days);
    return kstDateKey(parsed);
}
