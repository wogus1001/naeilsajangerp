import type { LeadDbLayer, LeadFormState } from './types';
import { formatLeadPhoneInput, normalizeLeadDesiredRegionValue } from './leadFormFormatters';
import { parseBudgetInputToWon } from './utils';

type LeadSubmitPayloadInput = {
    readonly form: LeadFormState;
    readonly requesterId: string;
    readonly companyName: string;
    readonly leadDbLayer: LeadDbLayer;
};

export function buildLeadSubmitPayload({
    form,
    requesterId,
    companyName,
    leadDbLayer
}: LeadSubmitPayloadInput) {
    return {
        ...form,
        requesterId,
        companyName,
        ...(form.id ? {} : { leadStage: leadDbLayer }),
        mobile: formatLeadPhoneInput(form.mobile),
        desiredRegion: normalizeLeadDesiredRegionValue(form.desiredRegion),
        managerId: form.managerId || requesterId,
        budgetMin: parseBudgetInputToWon(form.budgetMin),
        budgetMax: parseBudgetInputToWon(form.budgetMax),
        nextContactAt: form.nextContactAt ? new Date(form.nextContactAt).toISOString() : null
    };
}
