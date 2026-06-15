import type { FranchiseLeadStatus } from './franchise-leads';

export const LEAD_NEXT_ACTIONS = [
    '미정',
    '오늘 연락',
    '추가 상담',
    '자료 발송',
    '방문 상담',
    '계약 조건 확인',
    '보류 확인'
] as const;

export const LEAD_CONSULTATION_RESULTS = [
    '미상담',
    '연락 성공',
    '부재/무응답',
    '관심 높음',
    '조건 조율',
    '보류',
    '이탈'
] as const;

export const LEAD_FIT_LEVELS = ['미확인', '적합', '보통', '부적합'] as const;
export const LEAD_WORK_QUEUE_KEYS = ['all', 'overdue', 'today', 'no_response'] as const;

const LEAD_NEXT_CONTACT_PRESET_CONFIG = {
    today_afternoon: { label: '오늘 오후', days: 0, hour: 15, minute: 0 },
    tomorrow_morning: { label: '내일 오전', days: 1, hour: 10, minute: 0 },
    three_days_later: { label: '3일 후', days: 3, hour: 10, minute: 0 },
    week_later: { label: '1주 후', days: 7, hour: 10, minute: 0 }
} as const;

export type LeadNextAction = typeof LEAD_NEXT_ACTIONS[number];
export type LeadConsultationResult = typeof LEAD_CONSULTATION_RESULTS[number];
export type LeadFitLevel = typeof LEAD_FIT_LEVELS[number];
export type LeadWorkQueueKey = typeof LEAD_WORK_QUEUE_KEYS[number];
export type LeadNextContactPresetKey = keyof typeof LEAD_NEXT_CONTACT_PRESET_CONFIG;

export const LEAD_NEXT_CONTACT_PRESETS = [
    { key: 'today_afternoon', label: LEAD_NEXT_CONTACT_PRESET_CONFIG.today_afternoon.label },
    { key: 'tomorrow_morning', label: LEAD_NEXT_CONTACT_PRESET_CONFIG.tomorrow_morning.label },
    { key: 'three_days_later', label: LEAD_NEXT_CONTACT_PRESET_CONFIG.three_days_later.label },
    { key: 'week_later', label: LEAD_NEXT_CONTACT_PRESET_CONFIG.week_later.label }
] as const satisfies readonly {
    readonly key: LeadNextContactPresetKey;
    readonly label: string;
}[];

export type LeadWorkflowInput = {
    readonly status: FranchiseLeadStatus | string;
    readonly grade?: string | null;
    readonly nextContactAt?: string | null;
    readonly lastContactedAt?: string | null;
    readonly convertedCustomerId?: string | null;
    readonly nextAction?: LeadNextAction | null;
    readonly consultationResult?: LeadConsultationResult | null;
    readonly churnReason?: string | null;
    readonly budgetFit?: LeadFitLevel | null;
    readonly regionFit?: LeadFitLevel | null;
    readonly brandFit?: LeadFitLevel | null;
};

export type LeadWorkflowDraft = {
    readonly nextAction: LeadNextAction;
    readonly consultationResult: LeadConsultationResult;
    readonly churnReason: string;
    readonly budgetFit: LeadFitLevel;
    readonly regionFit: LeadFitLevel;
    readonly brandFit: LeadFitLevel;
};

export type LeadWorkQueueSummary = {
    readonly all: number;
    readonly actionable: number;
    readonly overdue: number;
    readonly today: number;
    readonly noResponse: number;
};

export const EMPTY_LEAD_WORKFLOW_DRAFT: LeadWorkflowDraft = {
    nextAction: '미정',
    consultationResult: '미상담',
    churnReason: '',
    budgetFit: '미확인',
    regionFit: '미확인',
    brandFit: '미확인'
};

const LEAD_WORK_QUEUE_LABELS: Record<LeadWorkQueueKey, string> = {
    all: '전체 업무',
    overdue: '연락 지연',
    today: '오늘 연락',
    no_response: '무응답 확인'
};

function parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isSameLocalDate(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function toLocalDateStamp(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function assertNever(value: never): never {
    throw new Error(`Unhandled lead work queue: ${value}`);
}

function createScheduledContactDate(now: Date, days: number, hour: number, minute: number) {
    const next = new Date(now);
    next.setDate(next.getDate() + days);
    next.setHours(hour, minute, 0, 0);
    return next;
}

function getLeadNextContactPresetConfig(key: LeadNextContactPresetKey) {
    return LEAD_NEXT_CONTACT_PRESET_CONFIG[key];
}

function getLeadSuggestedPresetKey(workflow: Pick<LeadWorkflowDraft, 'nextAction' | 'consultationResult'>): LeadNextContactPresetKey | null {
    switch (workflow.consultationResult) {
        case '이탈':
            return null;
        case '부재/무응답':
            return 'tomorrow_morning';
        case '보류':
            return 'week_later';
        case '조건 조율':
            return 'three_days_later';
        case '관심 높음':
        case '연락 성공':
        case '미상담':
            break;
        default:
            assertNever(workflow.consultationResult);
    }

    switch (workflow.nextAction) {
        case '오늘 연락':
            return 'today_afternoon';
        case '추가 상담':
        case '자료 발송':
        case '방문 상담':
            return 'tomorrow_morning';
        case '계약 조건 확인':
            return 'three_days_later';
        case '보류 확인':
            return 'week_later';
        case '미정':
            return null;
        default:
            assertNever(workflow.nextAction);
    }
}

export function isLeadPastDue(value?: string | null, now = new Date()) {
    const date = parseDate(value);
    return date ? toLocalDateStamp(date) < toLocalDateStamp(now) : false;
}

export function isLeadDueToday(value?: string | null, now = new Date()) {
    const date = parseDate(value);
    return date ? isSameLocalDate(date, now) : false;
}

export function isLeadContactActionDue(value?: string | null, now = new Date()) {
    return isLeadPastDue(value, now) || isLeadDueToday(value, now);
}

export function getLeadWorkQueueFlags(lead: LeadWorkflowInput, now = new Date()) {
    const overdue = isLeadPastDue(lead.nextContactAt, now);
    const today = !overdue && (isLeadDueToday(lead.nextContactAt, now) || lead.nextAction === '오늘 연락');
    const noResponse = lead.consultationResult === '부재/무응답';

    return { overdue, today, noResponse } as const;
}

export function getLeadWorkQueueLabel(lead: LeadWorkflowInput, now = new Date()) {
    const flags = getLeadWorkQueueFlags(lead, now);
    if (flags.overdue) return LEAD_WORK_QUEUE_LABELS.overdue;
    if (flags.today) return LEAD_WORK_QUEUE_LABELS.today;
    if (flags.noResponse) return LEAD_WORK_QUEUE_LABELS.no_response;
    return '후속 관리';
}

export function getLeadWorkQueueRank(lead: LeadWorkflowInput, now = new Date()) {
    const flags = getLeadWorkQueueFlags(lead, now);
    if (flags.overdue) return 0;
    if (flags.today) return 1;
    if (flags.noResponse) return 2;
    return 3;
}

export function matchesLeadWorkQueue(lead: LeadWorkflowInput, queue: LeadWorkQueueKey, now = new Date()) {
    const flags = getLeadWorkQueueFlags(lead, now);

    switch (queue) {
        case 'all':
            return flags.overdue || flags.today || flags.noResponse;
        case 'overdue':
            return flags.overdue;
        case 'today':
            return flags.today;
        case 'no_response':
            return flags.noResponse;
        default:
            return assertNever(queue);
    }
}

export function getLeadWorkQueueSummary(leads: readonly LeadWorkflowInput[], now = new Date()): LeadWorkQueueSummary {
    return leads.reduce<LeadWorkQueueSummary>((summary, lead) => {
        const flags = getLeadWorkQueueFlags(lead, now);
        const actionable = flags.overdue || flags.today || flags.noResponse;
        return {
            all: summary.all + 1,
            actionable: summary.actionable + (actionable ? 1 : 0),
            overdue: summary.overdue + (flags.overdue ? 1 : 0),
            today: summary.today + (flags.today ? 1 : 0),
            noResponse: summary.noResponse + (flags.noResponse ? 1 : 0)
        };
    }, { all: 0, actionable: 0, overdue: 0, today: 0, noResponse: 0 });
}

export function buildLeadWorkflowDraft(lead: LeadWorkflowInput | null): LeadWorkflowDraft {
    if (!lead) return EMPTY_LEAD_WORKFLOW_DRAFT;
    return {
        nextAction: lead.nextAction || EMPTY_LEAD_WORKFLOW_DRAFT.nextAction,
        consultationResult: lead.consultationResult || EMPTY_LEAD_WORKFLOW_DRAFT.consultationResult,
        churnReason: lead.churnReason || '',
        budgetFit: lead.budgetFit || EMPTY_LEAD_WORKFLOW_DRAFT.budgetFit,
        regionFit: lead.regionFit || EMPTY_LEAD_WORKFLOW_DRAFT.regionFit,
        brandFit: lead.brandFit || EMPTY_LEAD_WORKFLOW_DRAFT.brandFit
    };
}

export function buildLeadNextContactAt(key: LeadNextContactPresetKey, now = new Date()) {
    const config = getLeadNextContactPresetConfig(key);
    return createScheduledContactDate(now, config.days, config.hour, config.minute).toISOString();
}

export function suggestLeadNextContactAt(
    workflow: Pick<LeadWorkflowDraft, 'nextAction' | 'consultationResult'>,
    now = new Date()
) {
    const presetKey = getLeadSuggestedPresetKey(workflow);
    return presetKey ? buildLeadNextContactAt(presetKey, now) : null;
}

export function isLeadNextAction(value: string): value is LeadNextAction {
    return LEAD_NEXT_ACTIONS.some(option => option === value);
}

export function isLeadConsultationResult(value: string): value is LeadConsultationResult {
    return LEAD_CONSULTATION_RESULTS.some(option => option === value);
}

export function isLeadFitLevel(value: string): value is LeadFitLevel {
    return LEAD_FIT_LEVELS.some(option => option === value);
}
