import type { MeetingToolDraft } from '@/lib/franchise-location-meeting-tool';
import type { MeetingToolVersion } from '@/lib/franchise-location-meeting-tool-versions';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';

type LocationMeetingToolVersionsResponse = {
    readonly versions: readonly MeetingToolVersion[];
};

type LocationMeetingToolVersionResponse = {
    readonly version: MeetingToolVersion;
};

type SaveLocationMeetingToolVersionParams = {
    readonly locationId: string;
    readonly title: string;
    readonly meetingTool: MeetingToolDraft;
};

export async function fetchLocationMeetingToolVersionsRequest(locationId: string): Promise<readonly MeetingToolVersion[]> {
    const params = new URLSearchParams({ locationId });
    const headers = await getApiAuthHeaders();
    const response = await fetch(`/api/franchise-locations/meeting-tool-versions?${params.toString()}`, {
        cache: 'no-store',
        headers
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<LocationMeetingToolVersionsResponse>(payload).versions;
}

export async function saveLocationMeetingToolVersionRequest({
    locationId,
    meetingTool,
    title
}: SaveLocationMeetingToolVersionParams): Promise<MeetingToolVersion> {
    const headers = await getApiAuthHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch('/api/franchise-locations/meeting-tool-versions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ locationId, meetingTool, title })
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<LocationMeetingToolVersionResponse>(payload).version;
}
