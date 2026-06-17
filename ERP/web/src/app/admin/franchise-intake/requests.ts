import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import type { AdminFranchiseIntakeData, LeadPromotionRequest, PromotionRequest } from './types';

async function readPayload(response: Response): Promise<unknown> {
    return await response.json();
}

export async function fetchAdminFranchiseIntake(
    requesterId: string,
    companyId?: string
): Promise<AdminFranchiseIntakeData> {
    const params = new URLSearchParams();
    if (requesterId) params.set('requesterId', requesterId);
    if (companyId) params.set('companyId', companyId);

    const response = await fetch(`/api/admin/franchise-intake?${params.toString()}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<AdminFranchiseIntakeData>(payload);
}

export async function promoteAdminProperty(request: PromotionRequest): Promise<void> {
    const response = await fetch('/api/admin/franchise-intake/properties/promote', {
        method: 'POST',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(request)
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(readApiError(payload));
}

export async function promoteAdminLeadRegistration(request: LeadPromotionRequest): Promise<void> {
    const response = await fetch('/api/admin/franchise-intake/leads/promote', {
        method: 'POST',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(request)
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(readApiError(payload));
}

export async function promoteAdminMatchingRequest(request: LeadPromotionRequest): Promise<void> {
    const response = await fetch('/api/admin/franchise-intake/matching-requests/promote', {
        method: 'POST',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(request)
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(readApiError(payload));
}

export async function syncAdminProperty(request: Pick<PromotionRequest, 'propertyId' | 'requesterId'>): Promise<void> {
    const response = await fetch('/api/admin/franchise-intake/properties/update-promoted', {
        method: 'POST',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(request)
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(readApiError(payload));
}

export async function syncAdminMatchingRequest(request: Pick<LeadPromotionRequest, 'leadId' | 'requesterId'>): Promise<void> {
    const response = await fetch('/api/admin/franchise-intake/matching-requests/update-promoted', {
        method: 'POST',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(request)
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(readApiError(payload));
}

export async function syncAdminLeadRegistration(request: Pick<LeadPromotionRequest, 'leadId' | 'requesterId'>): Promise<void> {
    const response = await fetch('/api/admin/franchise-intake/leads/update-promoted', {
        method: 'POST',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(request)
    });
    const payload = await readPayload(response);
    if (!response.ok) throw new Error(readApiError(payload));
}
