import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import type {
    FranchiseLocationMessage,
    FranchiseLocationMessageSummary,
    LocationMessageKind,
    LocationMessagesResponse,
    LocationMessageSummariesResponse,
    LocationRequestStatus
} from './locationMessageTypes';

type RequestScope = {
    readonly userId: string;
};

type LocationMessageListParams = RequestScope & {
    readonly locationId: string;
};

type LocationMessageSummaryParams = RequestScope & {
    readonly locationIds: readonly string[];
};

type CreateLocationMessageParams = LocationMessageListParams & {
    readonly body: string;
    readonly kind: LocationMessageKind;
};

type UpdateLocationRequestStatusParams = RequestScope & {
    readonly messageId: string;
    readonly requestStatus: LocationRequestStatus;
};

export async function fetchLocationMessages({
    userId,
    locationId
}: LocationMessageListParams): Promise<LocationMessagesResponse> {
    const params = new URLSearchParams({ requesterId: userId, locationId });
    const response = await fetch(`/api/franchise-locations/messages?${params.toString()}`, { cache: 'no-store' });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<LocationMessagesResponse>(payload);
}

export async function fetchLocationMessageSummaries({
    userId,
    locationIds
}: LocationMessageSummaryParams): Promise<readonly FranchiseLocationMessageSummary[]> {
    if (locationIds.length === 0) return [];
    const params = new URLSearchParams({
        requesterId: userId,
        summary: 'true',
        locationIds: Array.from(new Set(locationIds)).join(',')
    });
    const response = await fetch(`/api/franchise-locations/messages?${params.toString()}`, { cache: 'no-store' });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<LocationMessageSummariesResponse>(payload).summaries || [];
}

export async function createLocationMessage({
    userId,
    locationId,
    body,
    kind
}: CreateLocationMessageParams): Promise<LocationMessagesResponse & { readonly message: FranchiseLocationMessage }> {
    const response = await fetch('/api/franchise-locations/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: userId, locationId, body, kind })
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<LocationMessagesResponse & { readonly message: FranchiseLocationMessage }>(payload);
}

export async function updateLocationRequestStatus({
    userId,
    messageId,
    requestStatus
}: UpdateLocationRequestStatusParams): Promise<LocationMessagesResponse & { readonly message: FranchiseLocationMessage }> {
    const response = await fetch('/api/franchise-locations/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: userId, messageId, requestStatus })
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<LocationMessagesResponse & { readonly message: FranchiseLocationMessage }>(payload);
}
