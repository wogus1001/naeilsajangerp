export const LEAD_CONTRACT_REQUIREMENT_TYPES = ['required', 'report', 'optional'] as const;
export const LEAD_CONTRACT_BASIS_TYPES = ['franchise_law', 'privacy', 'internal'] as const;
export const LEAD_CONTRACT_APPLICABILITY = ['applicable', 'not_applicable'] as const;

export type LeadContractRequirementType = typeof LEAD_CONTRACT_REQUIREMENT_TYPES[number];
export type LeadContractBasisType = typeof LEAD_CONTRACT_BASIS_TYPES[number];
export type LeadContractApplicability = typeof LEAD_CONTRACT_APPLICABILITY[number];

export type LeadContractChecklistDefinition = {
    readonly stepKey: string;
    readonly label: string;
    readonly required: boolean;
    readonly requirementType: LeadContractRequirementType;
    readonly basisType: LeadContractBasisType;
    readonly basisText: string;
    readonly ownerTeam: string;
    readonly requiredEvidence: boolean;
    readonly defaultApplicability: LeadContractApplicability;
    readonly allowNotApplicable: boolean;
    readonly sortOrder: number;
};

export type LeadContractChecklistDocumentSummary = {
    readonly count: number;
    readonly latestTitle: string;
    readonly latestStatus: string;
    readonly requiredEvidenceLinked: boolean;
    readonly documentIds: readonly string[];
};

export type LeadContractChecklistStepInput = {
    readonly stepKey?: unknown;
    readonly step_key?: unknown;
    readonly label?: unknown;
    readonly required?: unknown;
    readonly requirementType?: unknown;
    readonly requirement_type?: unknown;
    readonly basisType?: unknown;
    readonly basis_type?: unknown;
    readonly basisText?: unknown;
    readonly basis_text?: unknown;
    readonly ownerTeam?: unknown;
    readonly owner_team?: unknown;
    readonly applicability?: unknown;
    readonly requiredEvidence?: unknown;
    readonly required_evidence?: unknown;
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
    readonly documentSummary?: LeadContractChecklistDocumentSummary;
    readonly document_summary?: LeadContractChecklistDocumentSummary;
};

export type LeadContractChecklistStep = {
    readonly stepKey: LeadContractChecklistStepKey;
    readonly label: string;
    readonly required: boolean;
    readonly requirementType: LeadContractRequirementType;
    readonly basisType: LeadContractBasisType;
    readonly basisText: string;
    readonly ownerTeam: string;
    readonly applicability: LeadContractApplicability;
    readonly requiredEvidence: boolean;
    readonly allowNotApplicable: boolean;
    readonly completed: boolean;
    readonly resolved: boolean;
    readonly completedAt: string;
    readonly completedBy: string;
    readonly memo: string;
    readonly sortOrder: number;
    readonly updatedAt: string;
    readonly documentSummary: LeadContractChecklistDocumentSummary;
};

export type LeadContractChecklistGroupSummary = {
    readonly total: number;
    readonly completed: number;
    readonly resolved: number;
    readonly remaining: number;
    readonly progressPercent: number;
    readonly missingDocumentCount: number;
};

export type LeadContractChecklistSummary = {
    readonly total: number;
    readonly completed: number;
    readonly resolved: number;
    readonly remaining: number;
    readonly progressPercent: number;
    readonly missingRequiredCount: number;
    readonly groups: Record<LeadContractRequirementType, LeadContractChecklistGroupSummary>;
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
    readonly applicability?: LeadContractApplicability | null;
    readonly nowIso?: string;
    readonly existing?: LeadContractChecklistStepInput | null;
};

export type LeadContractChecklistUpsertPayload = {
    readonly company_id: string;
    readonly lead_id: string;
    readonly step_key: LeadContractChecklistStepKey;
    readonly label: string;
    readonly required: boolean;
    readonly requirement_type: LeadContractRequirementType;
    readonly basis_type: LeadContractBasisType;
    readonly basis_text: string;
    readonly owner_team: string;
    readonly applicability: LeadContractApplicability;
    readonly required_evidence: boolean;
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

export class InvalidLeadContractChecklistApplicabilityError extends Error {
    readonly stepKey: string;

    constructor(stepKey: string, message: string) {
        super(message);
        this.name = 'InvalidLeadContractChecklistApplicabilityError';
        this.stepKey = stepKey;
    }
}

export const LEAD_CONTRACT_CHECKLIST_DEFINITIONS = [
    {
        stepKey: 'owner-id-seal-certificate',
        label: '점주 신분증/인감증명서',
        required: true,
        requirementType: 'required',
        basisType: 'internal',
        basisText: '사업자 동일여부 확인 및 인장 사실유무 확인',
        ownerTeam: '점포개발',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: false,
        sortOrder: 10
    },
    {
        stepKey: 'disclosure-contract-receipt',
        label: '가맹계약서 및 정보공개서 수령확인서',
        required: true,
        requirementType: 'required',
        basisType: 'franchise_law',
        basisText: '가맹사업법 준수 및 정보공개서 제공 이력 확인',
        ownerTeam: '점포개발',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: false,
        sortOrder: 20
    },
    {
        stepKey: 'privacy-consent',
        label: '개인정보 수집·이용·제공 동의서',
        required: true,
        requirementType: 'required',
        basisType: 'privacy',
        basisText: '개인정보 수집·이용·제공 동의 원본 보관',
        ownerTeam: '점포개발',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: false,
        sortOrder: 30
    },
    {
        stepKey: 'site-survey-request',
        label: '점포개발/실측의뢰서',
        required: false,
        requirementType: 'optional',
        basisType: 'internal',
        basisText: '입점예정지 안정성 검토 및 실측 이력 관리',
        ownerTeam: '점포개발',
        requiredEvidence: false,
        defaultApplicability: 'applicable',
        allowNotApplicable: true,
        sortOrder: 40
    },
    {
        stepKey: 'lease-contract-copy',
        label: '건물 임대차계약서',
        required: false,
        requirementType: 'report',
        basisType: 'internal',
        basisText: '임대조건 및 계약일자 근거자료',
        ownerTeam: '점포개발',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: true,
        sortOrder: 50
    },
    {
        stepKey: 'expected-sales-statement',
        label: '예상매출액 산정서',
        required: true,
        requirementType: 'required',
        basisType: 'franchise_law',
        basisText: '대상 가맹본부의 예상수익상황 자료 제공 의무 확인',
        ownerTeam: '점포개발',
        requiredEvidence: true,
        defaultApplicability: 'not_applicable',
        allowNotApplicable: true,
        sortOrder: 60
    },
    {
        stepKey: 'franchise-contract',
        label: '가맹계약서',
        required: true,
        requirementType: 'required',
        basisType: 'franchise_law',
        basisText: '가맹계약서 제공 및 보관 의무 확인',
        ownerTeam: '점포개발',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: false,
        sortOrder: 80
    },
    {
        stepKey: 'opening-profit-report',
        label: '개설매출이익 보고 승인 문서',
        required: false,
        requirementType: 'report',
        basisType: 'internal',
        basisText: '사전 수익률 산출 및 의무 무상지원 방지 확인',
        ownerTeam: '점포개발',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: true,
        sortOrder: 110
    },
    {
        stepKey: 'special-terms-ceo-report',
        label: '특약사항 대표이사 보고 승인 문서',
        required: false,
        requirementType: 'report',
        basisType: 'internal',
        basisText: '특약사항 대표이사 승인 여부 확인',
        ownerTeam: '점포개발',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: true,
        sortOrder: 120
    },
    {
        stepKey: 'business-registration-license',
        label: '사업자등록증/영업신고증',
        required: true,
        requirementType: 'required',
        basisType: 'internal',
        basisText: '일반음식점 영업을 위한 필수 등록증 발급 확인',
        ownerTeam: '오픈담당',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: false,
        sortOrder: 130
    },
    {
        stepKey: 'opening-goods-order',
        label: '오픈물품 발주 확인서',
        required: false,
        requirementType: 'report',
        basisType: 'internal',
        basisText: '오픈 전 본점 설치 및 지원업무 진행사항 확인',
        ownerTeam: '오픈담당',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: true,
        sortOrder: 140
    },
    {
        stepKey: 'company-equipment-promotion-delivery',
        label: '본사기물/오픈 프로모션 납품 확인서',
        required: false,
        requirementType: 'report',
        basisType: 'internal',
        basisText: '본사 지원 물품 납품 및 인수 확인',
        ownerTeam: '오픈담당',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: true,
        sortOrder: 150
    },
    {
        stepKey: 'owner-training-confirmation',
        label: '점주교육확인서',
        required: false,
        requirementType: 'report',
        basisType: 'internal',
        basisText: '점주 교육 이수 및 운영 준비 확인',
        ownerTeam: '오픈담당',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: true,
        sortOrder: 160
    },
    {
        stepKey: 'advertising-cost-sharing-consent',
        label: '공동광고비 분담 동의서',
        required: false,
        requirementType: 'optional',
        basisType: 'internal',
        basisText: '공동광고분담금 고지 및 동의 확인',
        ownerTeam: '오픈담당',
        requiredEvidence: false,
        defaultApplicability: 'applicable',
        allowNotApplicable: true,
        sortOrder: 170
    },
    {
        stepKey: 'interior-estimate-and-drawing',
        label: '인테리어 견적서/확정도면',
        required: false,
        requirementType: 'report',
        basisType: 'internal',
        basisText: '공사 범위와 비용, 점주 확인 자료 보관',
        ownerTeam: '인테리어',
        requiredEvidence: true,
        defaultApplicability: 'applicable',
        allowNotApplicable: true,
        sortOrder: 180
    },
    {
        stepKey: 'contractor-defect-bond',
        label: '도급업체 하자이행증권',
        required: false,
        requirementType: 'optional',
        basisType: 'internal',
        basisText: '하자 발생 시 보상받기 위한 확인 서류',
        ownerTeam: '인테리어',
        requiredEvidence: false,
        defaultApplicability: 'applicable',
        allowNotApplicable: true,
        sortOrder: 220
    },
    {
        stepKey: 'hvac-defect-bond',
        label: '냉난방기 하자이행증권',
        required: false,
        requirementType: 'optional',
        basisType: 'internal',
        basisText: '냉난방기 하자 보상 가능 여부 확인',
        ownerTeam: '인테리어',
        requiredEvidence: false,
        defaultApplicability: 'applicable',
        allowNotApplicable: true,
        sortOrder: 230
    }
] as const satisfies readonly LeadContractChecklistDefinition[];

export type LeadContractChecklistStepKey = typeof LEAD_CONTRACT_CHECKLIST_DEFINITIONS[number]['stepKey'];

const EMPTY_DOCUMENT_SUMMARY: LeadContractChecklistDocumentSummary = {
    count: 0,
    latestTitle: '',
    latestStatus: '',
    requiredEvidenceLinked: false,
    documentIds: []
};

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

function readRequirementType(value: unknown, fallback: LeadContractRequirementType): LeadContractRequirementType {
    const raw = cleanString(value);
    switch (raw) {
        case 'required':
        case 'report':
        case 'optional':
            return raw;
        default:
            return fallback;
    }
}

function readBasisType(value: unknown, fallback: LeadContractBasisType): LeadContractBasisType {
    const raw = cleanString(value);
    switch (raw) {
        case 'franchise_law':
        case 'privacy':
        case 'internal':
            return raw;
        default:
            return fallback;
    }
}

function readApplicability(value: unknown, fallback: LeadContractApplicability): LeadContractApplicability {
    const raw = cleanString(value);
    switch (raw) {
        case 'applicable':
        case 'not_applicable':
            return raw;
        default:
            return fallback;
    }
}

function isStepResolved(step: Pick<LeadContractChecklistStep, 'applicability' | 'completed'>): boolean {
    return step.completed || step.applicability === 'not_applicable';
}

function normalizeDocumentSummary(
    definition: LeadContractChecklistDefinition,
    input: LeadContractChecklistDocumentSummary | undefined
): LeadContractChecklistDocumentSummary {
    if (!input) return EMPTY_DOCUMENT_SUMMARY;
    const documentIds = Array.isArray(input.documentIds)
        ? input.documentIds.map(cleanString).filter(Boolean)
        : [];
    const count = Math.max(0, Number.isFinite(input.count) ? input.count : documentIds.length);
    return {
        count,
        latestTitle: cleanString(input.latestTitle),
        latestStatus: cleanString(input.latestStatus),
        requiredEvidenceLinked: definition.requiredEvidence && count > 0,
        documentIds
    };
}

function summarizeGroup(steps: readonly LeadContractChecklistStep[]): LeadContractChecklistGroupSummary {
    const completed = steps.filter(step => step.completed).length;
    const resolved = steps.filter(isStepResolved).length;
    const missingDocumentCount = steps.filter(step => (
        step.requiredEvidence
        && step.applicability === 'applicable'
        && step.documentSummary.count === 0
    )).length;
    return {
        total: steps.length,
        completed,
        resolved,
        remaining: steps.length - resolved,
        progressPercent: steps.length === 0 ? 0 : Math.round((resolved / steps.length) * 100),
        missingDocumentCount
    };
}

export function getLeadContractChecklistDefinition(stepKey: string) {
    return LEAD_CONTRACT_CHECKLIST_DEFINITIONS.find(definition => definition.stepKey === stepKey) || null;
}

export function normalizeLeadContractChecklistStepKey(value: unknown): LeadContractChecklistStepKey | null {
    const raw = cleanString(value);
    return getLeadContractChecklistDefinition(raw)?.stepKey || null;
}

export function mergeLeadContractChecklistSteps(
    savedSteps: readonly LeadContractChecklistStepInput[] | null | undefined,
    documentSummaries: Record<string, LeadContractChecklistDocumentSummary> = {}
): readonly LeadContractChecklistStep[] {
    const savedByKey = new Map<LeadContractChecklistStepKey, LeadContractChecklistStepInput>();
    (savedSteps || []).forEach(step => {
        const key = normalizeLeadContractChecklistStepKey(step.stepKey ?? step.step_key);
        if (key) savedByKey.set(key, step);
    });

    return LEAD_CONTRACT_CHECKLIST_DEFINITIONS.map(definition => {
        const saved = savedByKey.get(definition.stepKey);
        const applicability = readApplicability(
            saved?.applicability,
            definition.defaultApplicability
        );
        const completed = applicability === 'not_applicable'
            ? false
            : readBoolean(saved?.completed, false);
        const documentSummary = normalizeDocumentSummary(
            definition,
            documentSummaries[definition.stepKey] || saved?.documentSummary || saved?.document_summary
        );
        const step = {
            stepKey: definition.stepKey,
            label: definition.label,
            required: readBoolean(saved?.required, definition.required),
            requirementType: readRequirementType(
                saved?.requirementType ?? saved?.requirement_type,
                definition.requirementType
            ),
            basisType: readBasisType(saved?.basisType ?? saved?.basis_type, definition.basisType),
            basisText: cleanString(saved?.basisText ?? saved?.basis_text) || definition.basisText,
            ownerTeam: cleanString(saved?.ownerTeam ?? saved?.owner_team) || definition.ownerTeam,
            applicability,
            requiredEvidence: readBoolean(saved?.requiredEvidence ?? saved?.required_evidence, definition.requiredEvidence),
            allowNotApplicable: definition.allowNotApplicable,
            completed,
            resolved: false,
            completedAt: cleanDateString(saved?.completedAt ?? saved?.completed_at),
            completedBy: cleanString(saved?.completedBy ?? saved?.completed_by),
            memo: cleanString(saved?.memo),
            sortOrder: readNumber(saved?.sortOrder ?? saved?.sort_order, definition.sortOrder),
            updatedAt: cleanDateString(saved?.updatedAt ?? saved?.updated_at),
            documentSummary
        };
        return {
            ...step,
            resolved: isStepResolved(step)
        };
    });
}

function summarizeMergedLeadContractChecklist(steps: readonly LeadContractChecklistStep[]): LeadContractChecklistSummary {
    const completed = steps.filter(step => step.completed).length;
    const resolved = steps.filter(isStepResolved).length;
    const groups = LEAD_CONTRACT_REQUIREMENT_TYPES.reduce<Record<LeadContractRequirementType, LeadContractChecklistGroupSummary>>(
        (acc, requirementType) => {
            acc[requirementType] = summarizeGroup(steps.filter(step => step.requirementType === requirementType));
            return acc;
        },
        {
            required: summarizeGroup([]),
            report: summarizeGroup([]),
            optional: summarizeGroup([])
        }
    );
    return {
        total: steps.length,
        completed,
        resolved,
        remaining: steps.length - resolved,
        progressPercent: steps.length === 0 ? 0 : Math.round((resolved / steps.length) * 100),
        missingRequiredCount: groups.required.missingDocumentCount,
        groups
    };
}

export function summarizeLeadContractChecklist(
    savedSteps: readonly LeadContractChecklistStepInput[] | null | undefined,
    documentSummaries: Record<string, LeadContractChecklistDocumentSummary> = {}
): LeadContractChecklistSummary {
    return summarizeMergedLeadContractChecklist(mergeLeadContractChecklistSteps(savedSteps, documentSummaries));
}

export function summarizeLeadContractChecklistForLead(
    leadId: string,
    savedSteps: readonly LeadContractChecklistStepInput[] | null | undefined,
    schemaReady = true,
    documentSummaries: Record<string, LeadContractChecklistDocumentSummary> = {}
): LeadContractChecklistSummaryView {
    const steps = mergeLeadContractChecklistSteps(savedSteps, documentSummaries);
    return {
        leadId,
        ...summarizeMergedLeadContractChecklist(steps),
        remainingLabels: steps
            .filter(step => step.requirementType === 'required' && !step.resolved)
            .map(step => step.label),
        schemaReady
    };
}

export function buildLeadContractChecklistSummaryMap(
    leadIds: readonly string[],
    savedRows: readonly LeadContractChecklistSummaryRowInput[],
    schemaReady = true,
    documentSummariesByLeadId: Record<string, Record<string, LeadContractChecklistDocumentSummary>> = {}
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
        acc[leadId] = summarizeLeadContractChecklistForLead(
            leadId,
            rowsByLeadId.get(leadId) || [],
            schemaReady,
            documentSummariesByLeadId[leadId] || {}
        );
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
    const nextMemo = input.memo === undefined ? existing?.memo || '' : cleanString(input.memo);
    const nextApplicability = input.applicability
        || existing?.applicability
        || definition.defaultApplicability;

    if (nextApplicability === 'not_applicable' && !nextMemo) {
        throw new InvalidLeadContractChecklistApplicabilityError(
            definition.stepKey,
            '해당없음 처리 사유를 메모에 입력해주세요.'
        );
    }

    const hasCompletedPatch = typeof input.completed === 'boolean';
    const nextCompleted = nextApplicability === 'not_applicable'
        ? false
        : hasCompletedPatch
            ? Boolean(input.completed)
            : Boolean(existing?.completed);
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
        requirement_type: definition.requirementType,
        basis_type: definition.basisType,
        basis_text: definition.basisText,
        owner_team: definition.ownerTeam,
        applicability: nextApplicability,
        required_evidence: definition.requiredEvidence,
        completed: nextCompleted,
        completed_at: completedAt,
        completed_by: completedBy,
        memo: nextMemo,
        sort_order: definition.sortOrder,
        updated_at: nowIso
    };
}
