import {
    DEFAULT_FRANCHISE_LEAD_STATUS,
    FRANCHISE_LEAD_REGISTRATION_SOURCE,
    type FranchiseLeadStatus
} from './franchise-leads';

export type LeadRegistrationForm = {
    readonly name: string;
    readonly mobile: string;
    readonly source: string;
    readonly status: FranchiseLeadStatus;
    readonly grade: string;
    readonly desiredRegion: string;
    readonly budgetMin: string;
    readonly budgetMax: string;
    readonly interestedBrand: string;
    readonly managerId: string;
    readonly nextContactAt: string;
    readonly memo: string;
};

export type LeadRegistrationPayloadContext = {
    readonly requesterId: string;
    readonly companyName: string;
};

export type LeadRegistrationPromotionContext = {
    readonly promotedAt: string;
    readonly promotedBy: string;
    readonly promotedByName: string;
    readonly activityId: string;
    readonly requestId: string;
};

type LeadActivityLogItem = {
    readonly id: string;
    readonly type: '메모';
    readonly content: string;
    readonly createdAt: string;
    readonly createdBy: string;
};

export const LEAD_REGISTRATION_INITIAL_FORM: LeadRegistrationForm = {
    name: '',
    mobile: '',
    source: '',
    status: DEFAULT_FRANCHISE_LEAD_STATUS,
    grade: '',
    desiredRegion: '',
    budgetMin: '',
    budgetMax: '',
    interestedBrand: '',
    managerId: '',
    nextContactAt: '',
    memo: ''
};

function cleanString(value: string): string {
    return value.trim();
}

export function parseManwonInputToWon(value: string): number | null {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed * 10000 : null;
}

function parseDatetimeInput(value: string): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function buildLeadRegistrationPayload(
    form: LeadRegistrationForm,
    context: LeadRegistrationPayloadContext
) {
    const selectedSource = cleanString(form.source);

    return {
        requesterId: context.requesterId,
        companyName: context.companyName,
        managerId: cleanString(form.managerId) || context.requesterId,
        name: cleanString(form.name),
        mobile: cleanString(form.mobile),
        source: selectedSource || FRANCHISE_LEAD_REGISTRATION_SOURCE,
        status: form.status,
        grade: form.grade,
        desiredRegion: cleanString(form.desiredRegion),
        budgetMin: parseManwonInputToWon(form.budgetMin),
        budgetMax: parseManwonInputToWon(form.budgetMax),
        interestedBrand: cleanString(form.interestedBrand),
        nextContactAt: parseDatetimeInput(form.nextContactAt),
        memo: cleanString(form.memo),
        registrationSource: selectedSource,
        requestSourceType: 'franchise_lead_registration'
    };
}

function readActivityLog(data: Record<string, unknown>): readonly unknown[] {
    return Array.isArray(data.activityLog) ? data.activityLog : [];
}

export function buildLeadRegistrationPromotionData(
    existingData: Record<string, unknown>,
    context: LeadRegistrationPromotionContext
): Record<string, unknown> {
    const activity: LeadActivityLogItem = {
        id: context.activityId,
        type: '메모',
        content: '어드민 인입 관리에서 가맹 희망자 목록으로 밀어넣기',
        createdAt: context.promotedAt,
        createdBy: context.promotedByName || context.promotedBy
    };

    return {
        ...existingData,
        leadStage: 'candidate',
        sourceType: 'franchise_lead_registration',
        adminIntakeStatus: 'promoted',
        leadRegistrationRequestId: context.requestId,
        intakePromotedAt: context.promotedAt,
        intakePromotedBy: context.promotedBy,
        activityLog: [activity, ...readActivityLog(existingData)]
    };
}
