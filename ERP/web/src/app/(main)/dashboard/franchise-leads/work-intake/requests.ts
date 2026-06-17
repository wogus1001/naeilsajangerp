import {
    buildLeadRegistrationPayload,
    LEAD_REGISTRATION_INITIAL_FORM,
    type LeadRegistrationForm
} from '@/lib/franchise-lead-registration';
import {
    buildMatchingRequestPayload,
    MATCHING_REQUEST_INITIAL_FORM,
    type MatchingRequestForm
} from '@/lib/franchise-matching-request';
import {
    buildPropertyRegistrationPayload,
    PROPERTY_REGISTRATION_INITIAL_FORM,
    type PropertyRegistrationForm
} from '@/lib/franchise-property-registration';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError } from '@/utils/apiResponse';
import type { WorkIntakeEditTarget } from './types';

export type WorkIntakeEditForm =
    | { readonly kind: 'properties'; readonly value: PropertyRegistrationForm }
    | { readonly kind: 'leadRegistrations'; readonly value: LeadRegistrationForm }
    | { readonly kind: 'matchingRequests'; readonly value: MatchingRequestForm };

export function buildInitialEditForm(target: WorkIntakeEditTarget): WorkIntakeEditForm {
    if (target.kind === 'properties') {
        return { kind: 'properties', value: { ...PROPERTY_REGISTRATION_INITIAL_FORM, ...target.item.form } };
    }
    if (target.kind === 'leadRegistrations') {
        return { kind: 'leadRegistrations', value: { ...LEAD_REGISTRATION_INITIAL_FORM, ...target.item.form } };
    }
    return { kind: 'matchingRequests', value: { ...MATCHING_REQUEST_INITIAL_FORM, ...target.item.form } };
}

export function buildWorkIntakeEditRequestBody(
    target: WorkIntakeEditTarget,
    form: WorkIntakeEditForm,
    requesterId: string
): Record<string, unknown> {
    if (target.kind === 'properties' && form.kind === 'properties') {
        return buildPropertyRegistrationPayload(form.value, {
            requesterId,
            companyName: target.item.companyName
        });
    }

    if (target.kind === 'leadRegistrations' && form.kind === 'leadRegistrations') {
        return buildLeadRegistrationPayload(form.value, {
            requesterId,
            companyName: ''
        });
    }

    if (target.kind === 'matchingRequests' && form.kind === 'matchingRequests') {
        return {
            id: target.item.id,
            ...buildMatchingRequestPayload(form.value, {
                requesterId,
                companyName: ''
            })
        };
    }

    return { requesterId };
}

async function readPayload(response: Response): Promise<unknown> {
    return await response.json();
}

export async function saveWorkIntakeEdit(
    target: WorkIntakeEditTarget,
    form: WorkIntakeEditForm,
    requesterId: string
): Promise<void> {
    if (target.kind === 'properties') {
        const response = await fetch(`/api/properties?id=${encodeURIComponent(target.item.id)}`, {
            method: 'PUT',
            headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(buildWorkIntakeEditRequestBody(target, form, requesterId))
        });
        const payload = await readPayload(response);
        if (!response.ok) throw new Error(readApiError(payload));
        return;
    }

    if (target.kind === 'leadRegistrations') {
        const response = await fetch(`/api/franchise-lead-registration-requests/${encodeURIComponent(target.item.id)}`, {
            method: 'PUT',
            headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(buildWorkIntakeEditRequestBody(target, form, requesterId))
        });
        const payload = await readPayload(response);
        if (!response.ok) throw new Error(readApiError(payload));
        return;
    }

    const response = await fetch('/api/franchise-leads', {
        method: 'PUT',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(buildWorkIntakeEditRequestBody(target, form, requesterId))
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(readApiError(payload));
}
