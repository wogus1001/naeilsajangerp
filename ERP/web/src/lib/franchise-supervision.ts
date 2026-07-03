export const SUPERVISION_VISIT_PURPOSES = ['정기점검', '긴급방문', '오픈후점검', '교육/지원'] as const;
export const SUPERVISION_VISIT_STATUSES = ['예정', '진행중', '보고서대기', '승인대기', '완료', '취소'] as const;
export const SUPERVISION_REPORT_STATUSES = ['임시저장', '제출', '승인', '반려'] as const;
export const SUPERVISION_ITEM_RESULTS = ['양호', '주의', '개선필요'] as const;
export const CORRECTIVE_ACTION_STATUSES = ['요청', '진행중', '완료', '보류'] as const;
export const SUPERVISION_REPORT_EVENT_TYPES = ['임시저장', '제출', '승인', '반려'] as const;
export const CORRECTIVE_ACTION_EVENT_TYPES = ['생성', '상태변경', '메모변경'] as const;

export type SupervisionVisitPurpose = typeof SUPERVISION_VISIT_PURPOSES[number];
export type SupervisionVisitStatus = typeof SUPERVISION_VISIT_STATUSES[number];
export type SupervisionReportStatus = typeof SUPERVISION_REPORT_STATUSES[number];
export type SupervisionItemResult = typeof SUPERVISION_ITEM_RESULTS[number];
export type CorrectiveActionStatus = typeof CORRECTIVE_ACTION_STATUSES[number];
export type SupervisionReportEventType = typeof SUPERVISION_REPORT_EVENT_TYPES[number];
export type CorrectiveActionEventType = typeof CORRECTIVE_ACTION_EVENT_TYPES[number];

export type SupervisionInspectionItem = {
    readonly id: string;
    readonly label: string;
    readonly result: SupervisionItemResult;
    readonly memo: string;
};

export type SupervisionPhotoAttachment = {
    readonly name: string;
    readonly path: string;
    readonly publicUrl?: string;
    readonly size: number;
    readonly contentType: string;
};

export type SupervisionReportTemplateItem = {
    readonly id: string;
    readonly label: string;
};

export type SupervisionReportTemplate = {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly inspectionItems: readonly SupervisionReportTemplateItem[];
    readonly active: boolean;
};

export type SupervisionReportStatusEvent =
    | { readonly kind: 'saveDraft' }
    | { readonly kind: 'submit' }
    | { readonly kind: 'approve' }
    | { readonly kind: 'reject' };

export type SupervisionDashboardInput = {
    readonly today: Date;
    readonly visits: readonly { readonly visitDate: string | null; readonly status: SupervisionVisitStatus }[];
    readonly reports: readonly { readonly status: SupervisionReportStatus }[];
    readonly correctiveActions: readonly { readonly status: CorrectiveActionStatus }[];
};

export type SupervisionSummary = {
    readonly todayVisitCount: number;
    readonly weekVisitCount: number;
    readonly missingReportCount: number;
    readonly pendingApprovalCount: number;
    readonly activeCorrectiveActionCount: number;
};

const DEFAULT_INSPECTION_ITEM_DEFINITIONS: readonly SupervisionReportTemplateItem[] = [
    { id: 'sales-traffic', label: '매출/객수 확인' },
    { id: 'cleanliness', label: '청결' },
    { id: 'service', label: '서비스' },
    { id: 'quality', label: '품질' },
    { id: 'inventory-logistics', label: '재고/물류' },
    { id: 'hq-support', label: '본사 지원' },
    { id: 'training-notice', label: '교육/공지 이행' },
    { id: 'other', label: '기타' }
];

function isOneOf<T extends readonly string[]>(value: string, choices: T): value is T[number] {
    return choices.includes(value);
}

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function kstDateKey(date: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

function startOfKstDay(date: Date): Date {
    const key = kstDateKey(date);
    return new Date(`${key}T00:00:00+09:00`);
}

export function normalizeVisitPurpose(value: unknown): SupervisionVisitPurpose {
    const candidate = cleanString(value);
    return isOneOf(candidate, SUPERVISION_VISIT_PURPOSES) ? candidate : '정기점검';
}

export function normalizeVisitStatus(value: unknown): SupervisionVisitStatus {
    const candidate = cleanString(value);
    return isOneOf(candidate, SUPERVISION_VISIT_STATUSES) ? candidate : '예정';
}

export function normalizeReportStatus(value: unknown): SupervisionReportStatus {
    const candidate = cleanString(value);
    return isOneOf(candidate, SUPERVISION_REPORT_STATUSES) ? candidate : '임시저장';
}

export function normalizeItemResult(value: unknown): SupervisionItemResult {
    const candidate = cleanString(value);
    return isOneOf(candidate, SUPERVISION_ITEM_RESULTS) ? candidate : '양호';
}

export function normalizeCorrectiveActionStatus(value: unknown): CorrectiveActionStatus {
    const candidate = cleanString(value);
    return isOneOf(candidate, CORRECTIVE_ACTION_STATUSES) ? candidate : '요청';
}

export function buildDefaultInspectionItems(): readonly SupervisionInspectionItem[] {
    return DEFAULT_INSPECTION_ITEM_DEFINITIONS.map(item => ({
        ...item,
        result: '양호',
        memo: ''
    }));
}

export function buildDefaultReportTemplate(): SupervisionReportTemplate {
    return {
        id: 'default',
        name: '기본 점검 템플릿',
        description: '운영점 기본 방문 점검 항목',
        inspectionItems: DEFAULT_INSPECTION_ITEM_DEFINITIONS,
        active: true
    };
}

export function normalizeTemplateItems(input: unknown): readonly SupervisionReportTemplateItem[] {
    if (!Array.isArray(input)) return DEFAULT_INSPECTION_ITEM_DEFINITIONS;
    const items = input
        .filter(isRecord)
        .map(record => ({
            id: cleanString(record.id),
            label: cleanString(record.label)
        }))
        .filter(item => item.id && item.label);
    return items.length > 0 ? items : DEFAULT_INSPECTION_ITEM_DEFINITIONS;
}

export function mergeInspectionItems(
    input: unknown,
    templateItems: readonly SupervisionReportTemplateItem[] = DEFAULT_INSPECTION_ITEM_DEFINITIONS
): readonly SupervisionInspectionItem[] {
    const baseItems = templateItems.length > 0 ? templateItems : DEFAULT_INSPECTION_ITEM_DEFINITIONS;
    if (!Array.isArray(input)) {
        return baseItems.map(item => ({ ...item, result: '양호', memo: '' }));
    }
    const savedItems = new Map<string, SupervisionInspectionItem>();

    input.forEach(record => {
        if (!isRecord(record)) return;
        const id = cleanString(record.id);
        if (!id) return;
        savedItems.set(id, {
            id,
            label: cleanString(record.label) || id,
            result: normalizeItemResult(record.result),
            memo: cleanString(record.memo)
        });
    });

    return baseItems.map(defaultItem => {
        const saved = savedItems.get(defaultItem.id);
        return {
            id: defaultItem.id,
            label: defaultItem.label,
            result: saved?.result || '양호',
            memo: saved?.memo || ''
        };
    });
}

export function nextReportStatus(
    current: SupervisionReportStatus,
    event: SupervisionReportStatusEvent
): SupervisionReportStatus {
    switch (event.kind) {
        case 'saveDraft':
            return current === '임시저장' || current === '반려' ? '임시저장' : current;
        case 'submit':
            return current === '임시저장' || current === '반려' ? '제출' : current;
        case 'approve':
            return current === '제출' ? '승인' : current;
        case 'reject':
            return current === '제출' ? '반려' : current;
    }
}

export function buildCorrectiveActionSeeds(
    reportId: string,
    items: readonly SupervisionInspectionItem[]
): readonly { readonly reportId: string; readonly itemId: string; readonly title: string; readonly memo: string }[] {
    return items
        .filter(item => item.result === '개선필요')
        .map(item => ({
            reportId,
            itemId: item.id,
            title: item.label,
            memo: item.memo
        }));
}

export function summarizeSupervision(input: SupervisionDashboardInput): SupervisionSummary {
    const today = startOfKstDay(input.today);
    const todayText = kstDateKey(today);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const activeVisitStatuses = new Set<SupervisionVisitStatus>(['예정', '진행중', '보고서대기', '승인대기']);

    return {
        todayVisitCount: input.visits.filter(visit => visit.visitDate === todayText && visit.status !== '취소').length,
        weekVisitCount: input.visits.filter(visit => {
            if (!visit.visitDate || !activeVisitStatuses.has(visit.status)) return false;
            const visitDate = new Date(`${visit.visitDate}T00:00:00+09:00`);
            return visitDate >= today && visitDate < weekEnd;
        }).length,
        missingReportCount: input.visits.filter(visit => visit.status === '보고서대기').length,
        pendingApprovalCount: input.reports.filter(report => report.status === '제출').length,
        activeCorrectiveActionCount: input.correctiveActions.filter(action => action.status === '요청' || action.status === '진행중').length
    };
}
