import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeMeetingToolDraft } from '@/lib/franchise-location-meeting-tool';
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
import {
    LIVE_LOCATION_INTERACTION_RUNTIME,
    resolveLocationInteractionRuntime,
    type LocationInteractionRuntime
} from './locationInteractionRuntime';

const fixtureDraft = normalizeMeetingToolDraft({ targetSales: 4_800 });

test('Given no injected location runtime When resolving interactions Then every live request helper remains the default', () => {
    const runtime = resolveLocationInteractionRuntime();

    assert.equal(runtime, LIVE_LOCATION_INTERACTION_RUNTIME);
    assert.equal(runtime.fetchMessageSummaries, fetchLocationMessageSummaries);
    assert.equal(runtime.fetchMessages, fetchLocationMessages);
    assert.equal(runtime.createMessage, createLocationMessage);
    assert.equal(runtime.updateRequestStatus, updateLocationRequestStatus);
    assert.equal(runtime.saveMeetingTool, saveLocationMeetingToolRequest);
    assert.equal(runtime.fetchPresets, fetchLocationMeetingToolPresetsRequest);
    assert.equal(runtime.savePreset, saveLocationMeetingToolPresetRequest);
    assert.equal(runtime.deletePreset, deleteLocationMeetingToolPresetRequest);
    assert.equal(runtime.fetchVersions, fetchLocationMeetingToolVersionsRequest);
    assert.equal(runtime.saveVersion, saveLocationMeetingToolVersionRequest);
});

test('Given an injected fixture runtime When resolving interactions Then its data and actions run without live requests', async () => {
    const calls: string[] = [];
    const runtime = {
        fetchMessageSummaries: async ({ locationIds }) => {
            calls.push('fetchMessageSummaries');
            return locationIds.map(locationId => ({
                latestMessageAt: null,
                locationId,
                openRequestCount: 0,
                totalCount: 0
            }));
        },
        fetchMessages: async ({ locationId }) => {
            calls.push('fetchMessages');
            return {
                messages: [],
                summary: {
                    latestMessageAt: null,
                    locationId,
                    openRequestCount: 0,
                    totalCount: 0
                }
            };
        },
        createMessage: async ({ locationId }) => {
            calls.push('createMessage');
            const message = {
                authorId: 'demo-user',
                authorName: '데모 담당자',
                body: 'fixture',
                companyId: 'demo-company',
                createdAt: '2026-07-30T00:00:00.000Z',
                id: 'demo-message',
                kind: 'note' as const,
                locationId,
                requestStatus: null,
                resolvedAt: null,
                resolvedBy: null,
                resolvedByName: '',
                updatedAt: '2026-07-30T00:00:00.000Z'
            };
            return {
                message,
                messages: [message],
                summary: {
                    latestMessageAt: message.createdAt,
                    locationId,
                    openRequestCount: 0,
                    totalCount: 1
                }
            };
        },
        updateRequestStatus: async () => {
            calls.push('updateRequestStatus');
            throw new Error('fixture has no request message');
        },
        saveMeetingTool: async ({ meetingTool }) => {
            calls.push('saveMeetingTool');
            return meetingTool;
        },
        fetchPresets: async () => {
            calls.push('fetchPresets');
            return [];
        },
        savePreset: async ({ name, meetingTool }) => {
            calls.push('savePreset');
            return {
                ...meetingTool,
                createdAt: '2026-07-30T00:00:00.000Z',
                id: 'demo-preset',
                name,
                updatedAt: '2026-07-30T00:00:00.000Z'
            };
        },
        deletePreset: async () => {
            calls.push('deletePreset');
        },
        fetchVersions: async () => {
            calls.push('fetchVersions');
            return [];
        },
        saveVersion: async ({ locationId, meetingTool, title }) => {
            calls.push('saveVersion');
            return {
                companyId: 'demo-company',
                createdAt: '2026-07-30T00:00:00.000Z',
                createdBy: 'demo-user',
                id: 'demo-version',
                locationId,
                meetingTool,
                title,
                versionNumber: 1
            };
        }
    } satisfies LocationInteractionRuntime;

    const resolved = resolveLocationInteractionRuntime(runtime);
    const savedDraft = await resolved.saveMeetingTool({
        locationId: 'demo-location',
        meetingTool: fixtureDraft
    });
    const savedPreset = await resolved.savePreset({
        companyId: 'demo-company',
        meetingTool: fixtureDraft,
        name: 'fixture preset'
    });
    const savedVersion = await resolved.saveVersion({
        locationId: 'demo-location',
        meetingTool: fixtureDraft,
        title: 'fixture version'
    });

    assert.equal(resolved, runtime);
    assert.equal(savedDraft.targetSales, 4_800);
    assert.equal(savedPreset.id, 'demo-preset');
    assert.equal(savedVersion.id, 'demo-version');
    assert.deepEqual(calls, ['saveMeetingTool', 'savePreset', 'saveVersion']);
});
