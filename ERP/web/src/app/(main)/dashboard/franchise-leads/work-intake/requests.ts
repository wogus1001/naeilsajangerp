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
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import type { WorkIntakeEditTarget } from './types';

export type WorkIntakeEditForm =
    | { readonly kind: 'properties'; readonly value: PropertyRegistrationForm }
    | { readonly kind: 'leadRegistrations'; readonly value: LeadRegistrationForm }
    | { readonly kind: 'matchingRequests'; readonly value: MatchingRequestForm };

export type WorkIntakeDeleteResult = {
    readonly success: boolean;
    readonly deleteHistoryStored?: boolean;
    readonly message?: string;
};

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
        const payload = buildPropertyRegistrationPayload(form.value, {
            requesterId,
            companyName: target.item.companyName
        });
        return {
            ...payload,
            managerId: target.item.managerId || target.item.authorId || requesterId
        };
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
            }),
            managerId: target.item.managerId || target.item.authorId || requesterId
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
        const response = await fetch(`/api/franchise-work-intake/properties/${encodeURIComponent(target.item.id)}`, {
            method: 'PUT',
            headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(buildWorkIntakeEditRequestBody(target, form, requesterId))
        });
        const payload = await readPayload(response);
        if (!response.ok) throw new Error(readApiError(payload));
        return;
    }

    if (target.kind === 'leadRegistrations') {
        const response = await fetch(`/api/franchise-work-intake/leadRegistrations/${encodeURIComponent(target.item.id)}`, {
            method: 'PUT',
            headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(buildWorkIntakeEditRequestBody(target, form, requesterId))
        });
        const payload = await readPayload(response);
        if (!response.ok) throw new Error(readApiError(payload));
        return;
    }

    const response = await fetch(`/api/franchise-work-intake/matchingRequests/${encodeURIComponent(target.item.id)}`, {
        method: 'PUT',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(buildWorkIntakeEditRequestBody(target, form, requesterId))
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(readApiError(payload));
}

function readWorkIntakeDeleteError(payload: unknown): string {
    const message = readApiError(payload);
    if (message === 'Failed to delete work intake record') {
        return '삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    if (message === 'requesterId is required') {
        return '로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도해주세요.';
    }
    return message;
}

export async function deleteWorkIntakeItem(target: WorkIntakeEditTarget, requesterId: string): Promise<WorkIntakeDeleteResult> {
    const params = new URLSearchParams({ requesterId });
    const response = await fetch(`/api/franchise-work-intake/${target.kind}/${encodeURIComponent(target.item.id)}?${params.toString()}`, {
        method: 'DELETE',
        headers: await getApiAuthHeaders()
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(readWorkIntakeDeleteError(payload));
    return unwrapApiData<WorkIntakeDeleteResult>(payload);
}

export async function permanentlyDeleteWorkIntakeRecord(recordId: string): Promise<void> {
    let response: Response;
    try {
        response = await fetch(`/api/franchise-work-intake/deleted-records/${encodeURIComponent(recordId)}`, {
            method: 'DELETE',
            headers: await getApiAuthHeaders()
        });
    } catch {
        throw new Error('네트워크 연결을 확인한 뒤 완전삭제를 다시 시도해주세요.');
    }

    let payload: unknown;
    try {
        payload = await readPayload(response);
    } catch {
        throw new Error('서버 응답을 확인하지 못했습니다. 잠시 후 완전삭제를 다시 시도해주세요.');
    }
    if (!response.ok) {
        const message = readApiError(payload);
        throw new Error(message === 'Request failed.' ? '완전삭제 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.' : message);
    }
}
