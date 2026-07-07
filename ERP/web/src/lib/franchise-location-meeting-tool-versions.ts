import {
    normalizeMeetingToolDraft,
    type MeetingToolDraft
} from './franchise-location-meeting-tool';

export type MeetingToolVersion = {
    readonly id: string;
    readonly companyId: string;
    readonly locationId: string;
    readonly versionNumber: number;
    readonly title: string;
    readonly meetingTool: MeetingToolDraft;
    readonly createdBy: string | null;
    readonly createdAt: string | null;
};

type MutableMeetingToolVersion = {
    readonly id?: unknown;
    readonly companyId?: unknown;
    readonly locationId?: unknown;
    readonly versionNumber?: unknown;
    readonly title?: unknown;
    readonly meetingTool?: unknown;
    readonly createdBy?: unknown;
    readonly createdAt?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

function parseVersionNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function makeMeetingToolVersionTitle(versionNumber: number, title: string): string {
    const cleanedTitle = cleanString(title);
    return cleanedTitle || `v${versionNumber} 검토안`;
}

export function formatMeetingToolVersionDisplayTitle(versionNumber: number, title: string): string {
    const resolvedTitle = makeMeetingToolVersionTitle(versionNumber, title);
    const prefix = `v${versionNumber}`;
    return resolvedTitle === prefix || resolvedTitle.startsWith(`${prefix} `)
        ? resolvedTitle
        : `${prefix} ${resolvedTitle}`;
}

export function normalizeMeetingToolVersion(value: unknown): MeetingToolVersion | null {
    const source: MutableMeetingToolVersion = isRecord(value) ? value : {};
    const id = cleanString(source.id);
    const companyId = cleanString(source.companyId);
    const locationId = cleanString(source.locationId);
    const versionNumber = parseVersionNumber(source.versionNumber);
    if (!id || !companyId || !locationId || versionNumber === null) return null;

    return {
        id,
        companyId,
        locationId,
        versionNumber,
        title: makeMeetingToolVersionTitle(versionNumber, cleanString(source.title)),
        meetingTool: normalizeMeetingToolDraft(source.meetingTool),
        createdBy: cleanString(source.createdBy) || null,
        createdAt: cleanString(source.createdAt) || null
    };
}
