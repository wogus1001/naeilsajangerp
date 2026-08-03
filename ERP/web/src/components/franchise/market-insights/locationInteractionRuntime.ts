import {
    deleteLocationMeetingToolPresetRequest,
    fetchLocationMeetingToolPresetsRequest,
    saveLocationMeetingToolPresetRequest,
    saveLocationMeetingToolRequest
} from './locationMasterRequests';
import {
    createLocationMessage,
    fetchLocationMessages,
    fetchLocationMessageSummaries,
    updateLocationRequestStatus
} from './locationMessageRequests';
import {
    fetchLocationMeetingToolVersionsRequest,
    saveLocationMeetingToolVersionRequest
} from './locationMeetingToolVersionRequests';

export type LocationInteractionRuntime = {
    readonly fetchMessageSummaries: typeof fetchLocationMessageSummaries;
    readonly fetchMessages: typeof fetchLocationMessages;
    readonly createMessage: typeof createLocationMessage;
    readonly updateRequestStatus: typeof updateLocationRequestStatus;
    readonly saveMeetingTool: typeof saveLocationMeetingToolRequest;
    readonly fetchPresets: typeof fetchLocationMeetingToolPresetsRequest;
    readonly savePreset: typeof saveLocationMeetingToolPresetRequest;
    readonly deletePreset: typeof deleteLocationMeetingToolPresetRequest;
    readonly fetchVersions: typeof fetchLocationMeetingToolVersionsRequest;
    readonly saveVersion: typeof saveLocationMeetingToolVersionRequest;
};

export const LIVE_LOCATION_INTERACTION_RUNTIME: LocationInteractionRuntime = {
    fetchMessageSummaries: fetchLocationMessageSummaries,
    fetchMessages: fetchLocationMessages,
    createMessage: createLocationMessage,
    updateRequestStatus: updateLocationRequestStatus,
    saveMeetingTool: saveLocationMeetingToolRequest,
    fetchPresets: fetchLocationMeetingToolPresetsRequest,
    savePreset: saveLocationMeetingToolPresetRequest,
    deletePreset: deleteLocationMeetingToolPresetRequest,
    fetchVersions: fetchLocationMeetingToolVersionsRequest,
    saveVersion: saveLocationMeetingToolVersionRequest
};

export function resolveLocationInteractionRuntime(
    runtime?: LocationInteractionRuntime | null
): LocationInteractionRuntime {
    return runtime || LIVE_LOCATION_INTERACTION_RUNTIME;
}
