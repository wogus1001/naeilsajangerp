export type LeadContractChecklistDefinition = {
    readonly stepKey: string;
    readonly label: string;
    readonly required: boolean;
    readonly sortOrder: number;
};

export type LeadContractChecklistStepInput = {
    readonly stepKey?: unknown;
    readonly step_key?: unknown;
    readonly label?: unknown;
    readonly required?: unknown;
    readonly completed?: unknown;
    readonly completedAt?: unknown;
    readonly completed_at?: unknown;
    readonly completedBy?: unknown;
    readonly completed_by?: unknown;
    readonly memo?: unknown;
    readonly sortOrder?: unknown;
    readonly sort_order?: unknown;
    readonly updatedAt?: unknown;
    readonly updated_at?: unknown;
};

export type LeadContractChecklistStep = {
    readonly stepKey: LeadContractChecklistStepKey;
    readonly label: string;
    readonly required: boolean;
    readonly completed: boolean;
    readonly completedAt: string;
    readonly completedBy: string;
    readonly memo: string;
    readonly sortOrder: number;
    readonly updatedAt: string;
};

export type LeadContractChecklistSummary = {
    readonly total: number;
    readonly completed: number;
    readonly remaining: number;
    readonly progressPercent: number;
};

export type LeadContractChecklistSummaryView = LeadContractChecklistSummary & {
    readonly leadId: string;
    readonly remainingLabels: readonly string[];
    readonly schemaReady: boolean;
};

export type LeadContractChecklistSummaryRowInput = LeadContractChecklistStepInput & {
    readonly companyId?: unknown;
    readonly company_id?: unknown;
    readonly leadId?: unknown;
    readonly lead_id?: unknown;
};

export type LeadContractChecklistLeadScopeInput = {
    readonly companyId?: unknown;
    readonly company_id?: unknown;
    readonly id?: unknown;
    readonly leadId?: unknown;
    readonly lead_id?: unknown;
};

export type LeadContractChecklistUpsertInput = {
    readonly companyId: string;
    readonly leadId: string;
    readonly requesterId: string;
    readonly stepKey: string;
    readonly completed?: boolean | null;
    readonly memo?: unknown;
    readonly nowIso?: string;
    readonly existing?: LeadContractChecklistStepInput | null;
};

export type LeadContractChecklistUpsertPayload = {
    readonly company_id: string;
    readonly lead_id: string;
    readonly step_key: LeadContractChecklistStepKey;
    readonly label: string;
    readonly required: boolean;
    readonly completed: boolean;
    readonly completed_at: string | null;
    readonly completed_by: string | null;
    readonly memo: string;
    readonly sort_order: number;
    readonly updated_at: string;
};

export class UnknownLeadContractChecklistStepError extends Error {
    readonly stepKey: string;

    constructor(stepKey: string) {
        super(`Unknown lead contract checklist step: ${stepKey}`);
        this.name = 'UnknownLeadContractChecklistStepError';
        this.stepKey = stepKey;
    }
}

export const LEAD_CONTRACT_CHECKLIST_DEFINITIONS = [
    { stepKey: 'disclosure-received', label: '정보공개서 수령 확인', required: true, sortOrder: 10 },
    { stepKey: 'site-reviewed', label: '브랜드/본사 사이트 확인', required: true, sortOrder: 20 },
    { stepKey: 'budget-reconfirmed', label: '예상 투자금 재확인', required: true, sortOrder: 30 },
    { stepKey: 'region-market-reviewed', label: '희망지역/상권자료 확인', required: true, sortOrder: 40 },
    { stepKey: 'nearby-stores-reviewed', label: '인근 가맹점 현황 확인', required: true, sortOrder: 50 },
    { stepKey: 'contract-date-eligible', label: '계약 가능일 도래 확인', required: true, sortOrder: 60 },
    { stepKey: 'contract-fee-briefed', label: '계약서/가맹금 안내', required: true, sortOrder: 70 }
] as const satisfies readonly LeadContractChecklistDefinition[];

export type LeadContractChecklistStepKey = typeof LEAD_CONTRACT_CHECKLIST_DEFINITIONS[number]['stepKey'];

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function cleanDateString(value: unknown): string {
    const raw = cleanString(value);
    if (!raw) return '';
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function readBoolean(value: unknown, fallback: boolean): boolean {
    if (value === true || value === false) return value;
    if (typeof value === 'number') return value === 1;
    const raw = cleanString(value).toLowerCase();
    if (['true', '1', 'yes', 'y', '완료'].includes(raw)) return true;
    if (['false', '0', 'no', 'n', '대기'].includes(raw)) return false;
    return fallback;
}

function readNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const raw = cleanString(value);
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function getLeadContractChecklistDefinition(stepKey: string) {
    return LEAD_CONTRACT_CHECKLIST_DEFINITIONS.find(definition => definition.stepKey === stepKey) || null;
}

export function normalizeLeadContractChecklistStepKey(value: unknown): LeadContractChecklistStepKey | null {
    const raw = cleanString(value);
    return getLeadContractChecklistDefinition(raw)?.stepKey || null;
}

export function mergeLeadContractChecklistSteps(
    savedSteps: readonly LeadContractChecklistStepInput[] | null | undefined
): readonly LeadContractChecklistStep[] {
    const savedByKey = new Map<LeadContractChecklistStepKey, LeadContractChecklistStepInput>();
    (savedSteps || []).forEach(step => {
        const key = normalizeLeadContractChecklistStepKey(step.stepKey ?? step.step_key);
        if (key) savedByKey.set(key, step);
    });

    return LEAD_CONTRACT_CHECKLIST_DEFINITIONS.map(definition => {
        const saved = savedByKey.get(definition.stepKey);
        return {
            stepKey: definition.stepKey,
            label: definition.label,
            required: readBoolean(saved?.required, definition.required),
            completed: readBoolean(saved?.completed, false),
            completedAt: cleanDateString(saved?.completedAt ?? saved?.completed_at),
            completedBy: cleanString(saved?.completedBy ?? saved?.completed_by),
            memo: cleanString(saved?.memo),
            sortOrder: readNumber(saved?.sortOrder ?? saved?.sort_order, definition.sortOrder),
            updatedAt: cleanDateString(saved?.updatedAt ?? saved?.updated_at)
        };
    });
}

function summarizeMergedLeadContractChecklist(steps: readonly LeadContractChecklistStep[]): LeadContractChecklistSummary {
    const completed = steps.filter(step => step.completed).length;
    return {
        total: steps.length,
        completed,
        remaining: steps.length - completed,
        progressPercent: steps.length === 0 ? 0 : Math.round((completed / steps.length) * 100)
    };
}

export function summarizeLeadContractChecklist(
    savedSteps: readonly LeadContractChecklistStepInput[] | null | undefined
): LeadContractChecklistSummary {
    return summarizeMergedLeadContractChecklist(mergeLeadContractChecklistSteps(savedSteps));
}

export function summarizeLeadContractChecklistForLead(
    leadId: string,
    savedSteps: readonly LeadContractChecklistStepInput[] | null | undefined,
    schemaReady = true
): LeadContractChecklistSummaryView {
    const steps = mergeLeadContractChecklistSteps(savedSteps);
    return {
        leadId,
        ...summarizeMergedLeadContractChecklist(steps),
        remainingLabels: steps
            .filter(step => step.required && !step.completed)
            .map(step => step.label),
        schemaReady
    };
}

export function buildLeadContractChecklistSummaryMap(
    leadIds: readonly string[],
    savedRows: readonly LeadContractChecklistSummaryRowInput[],
    schemaReady = true
): Record<string, LeadContractChecklistSummaryView> {
    const rowsByLeadId = new Map<string, LeadContractChecklistStepInput[]>();
    savedRows.forEach(row => {
        const leadId = cleanString(row.leadId ?? row.lead_id);
        if (!leadId) return;
        const rows = rowsByLeadId.get(leadId) || [];
        rows.push(row);
        rowsByLeadId.set(leadId, rows);
    });

    return leadIds.reduce<Record<string, LeadContractChecklistSummaryView>>((acc, leadId) => {
        acc[leadId] = summarizeLeadContractChecklistForLead(leadId, rowsByLeadId.get(leadId) || [], schemaReady);
        return acc;
    }, {});
}

export function filterLeadContractChecklistRowsByLeadCompany(
    savedRows: readonly LeadContractChecklistSummaryRowInput[],
    leads: readonly LeadContractChecklistLeadScopeInput[]
): readonly LeadContractChecklistSummaryRowInput[] {
    const leadCompanyById = new Map<string, string>();
    leads.forEach(lead => {
        const leadId = cleanString(lead.leadId ?? lead.lead_id ?? lead.id);
        const companyId = cleanString(lead.companyId ?? lead.company_id);
        if (leadId && companyId) leadCompanyById.set(leadId, companyId);
    });

    return savedRows.filter(row => {
        const leadId = cleanString(row.leadId ?? row.lead_id);
        const companyId = cleanString(row.companyId ?? row.company_id);
        return Boolean(leadId && companyId && leadCompanyById.get(leadId) === companyId);
    });
}

export function buildLeadContractChecklistUpsert(
    input: LeadContractChecklistUpsertInput
): LeadContractChecklistUpsertPayload {
    const definition = getLeadContractChecklistDefinition(input.stepKey);
    if (!definition) {
        throw new UnknownLeadContractChecklistStepError(input.stepKey);
    }

    const existingInput = input.existing
        ? {
            ...input.existing,
            stepKey: input.existing.stepKey ?? input.existing.step_key ?? definition.stepKey
        }
        : null;
    const existing = mergeLeadContractChecklistSteps(existingInput ? [existingInput] : [])
        .find(step => step.stepKey === definition.stepKey);
    const nowIso = input.nowIso || new Date().toISOString();
    const hasCompletedPatch = typeof input.completed === 'boolean';
    const nextCompleted = hasCompletedPatch ? Boolean(input.completed) : Boolean(existing?.completed);
    const completedAt = nextCompleted
        ? hasCompletedPatch && !existing?.completed
            ? nowIso
            : existing?.completedAt || nowIso
        : null;
    const completedBy = nextCompleted
        ? hasCompletedPatch && !existing?.completed
            ? input.requesterId
            : existing?.completedBy || input.requesterId
        : null;

    return {
        company_id: input.companyId,
        lead_id: input.leadId,
        step_key: definition.stepKey,
        label: definition.label,
        required: definition.required,
        completed: nextCompleted,
        completed_at: completedAt,
        completed_by: completedBy,
        memo: input.memo === undefined ? existing?.memo || '' : cleanString(input.memo),
        sort_order: definition.sortOrder,
        updated_at: nowIso
    };
}
