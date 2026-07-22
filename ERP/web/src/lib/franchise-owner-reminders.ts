import {
    buildOwnerPhase3SourceKey,
    cleanOwnerPhase3Text,
    isOwnerPhase3SourceType,
    isOwnerPhase3Uuid
} from './franchise-owner-phase3';
import { isOwnerRecord } from './franchise-owner-portal';

export const OWNER_REMINDER_SOURCE_TYPES = ['checklist_issue', 'content_item'] as const;
export type OwnerReminderSourceType = typeof OWNER_REMINDER_SOURCE_TYPES[number];
export type OwnerReminderEventType = 'reminder_created' | 'reminder_acknowledged';

export const OWNER_REMINDER_SELECT = 'id, company_id, location_id, owner_account_id, source_type, source_id, reminder_kind, message, due_at, sent_at, acknowledged_at, created_by, created_at' as const;
export const OWNER_REMINDER_ON_CONFLICT = 'company_id,owner_account_id,source_type,source_id,reminder_kind' as const;

export type OwnerReminderRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly owner_account_id: string;
    readonly source_type: OwnerReminderSourceType;
    readonly source_id: string;
    readonly reminder_kind: string;
    readonly message: string;
    readonly due_at: string | null;
    readonly sent_at: string;
    readonly acknowledged_at: string | null;
    readonly created_by: string | null;
    readonly created_at: string;
};

export type OwnerReminderCreateInput = {
    readonly sourceType: OwnerReminderSourceType;
    readonly sourceId: string;
    readonly locationIds: readonly string[];
    readonly reminderKind: string;
    readonly message: string;
    readonly dueAt: string | null;
};

export type OwnerReminderStats = {
    readonly total: number;
    readonly acknowledged: number;
    readonly unacknowledged: number;
    readonly ownerCount: number;
    readonly bySourceType: Readonly<Record<OwnerReminderSourceType, number>>;
    readonly byLocation: readonly {
        readonly locationId: string;
        readonly total: number;
        readonly acknowledged: number;
        readonly unacknowledged: number;
    }[];
};

export type OwnerReminderPortalEventRow = {
    readonly company_id: string;
    readonly location_id: string;
    readonly owner_account_id: string;
    readonly source_type: OwnerReminderSourceType;
    readonly source_id: string;
    readonly event_type: OwnerReminderEventType;
    readonly event_data: Readonly<Record<string, unknown>>;
    readonly occurred_at: string;
};

export type OwnerReminderRequestErrorCode = 'VALIDATION_ERROR' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT';

export class OwnerReminderRequestError extends Error {
    readonly name = 'OwnerReminderRequestError';

    constructor(
        readonly status: 400 | 403 | 404 | 409,
        readonly code: OwnerReminderRequestErrorCode,
        message: string
    ) {
        super(message);
    }
}

export function isOwnerReminderSourceType(value: unknown): value is OwnerReminderSourceType {
    return isOwnerPhase3SourceType(value) && (value === 'checklist_issue' || value === 'content_item');
}

function readOwnerReminderRawLocations(value: unknown): readonly unknown[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.includes(',')) return value.split(',');
    return [value];
}

export function normalizeOwnerReminderLocationIds(value: unknown): readonly string[] {
    return Array.from(new Set(readOwnerReminderRawLocations(value)
        .map(cleanOwnerPhase3Text)
        .filter(isOwnerPhase3Uuid)));
}

export function parseOwnerReminderCreateInput(value: unknown): OwnerReminderCreateInput | null {
    if (!isOwnerRecord(value)) return null;
    const sourceType = cleanOwnerPhase3Text(value.sourceType ?? value.source_type);
    const sourceId = cleanOwnerPhase3Text(value.sourceId ?? value.source_id);
    const rawLocations = readOwnerReminderRawLocations(value.locationIds ?? value.location_ids ?? value.locationId ?? value.location_id);
    const locationTexts = rawLocations.map(cleanOwnerPhase3Text).filter(Boolean);
    const locationIds = normalizeOwnerReminderLocationIds(rawLocations);
    const dueText = cleanOwnerPhase3Text(value.dueAt ?? value.due_at);
    const dueTime = dueText ? new Date(dueText).getTime() : 0;
    if (!isOwnerReminderSourceType(sourceType) || !sourceId || locationIds.length === 0) return null;
    if (locationTexts.some(locationId => !isOwnerPhase3Uuid(locationId)) || locationIds.length !== new Set(locationTexts).size) return null;
    if (dueText && !Number.isFinite(dueTime)) return null;
    return {
        sourceType,
        sourceId,
        locationIds,
        reminderKind: cleanOwnerPhase3Text(value.reminderKind ?? value.reminder_kind) || 'manual',
        message: cleanOwnerPhase3Text(value.message ?? value.reminderMessage ?? value.reminder_message),
        dueAt: dueText ? new Date(dueText).toISOString() : null
    };
}

export function readOwnerReminderId(value: unknown): string {
    if (!isOwnerRecord(value)) return '';
    return cleanOwnerPhase3Text(value.id ?? value.reminderId ?? value.reminder_id);
}

export function shouldIncludeAcknowledgedOwnerReminders(searchParams: URLSearchParams): boolean {
    const status = cleanOwnerPhase3Text(searchParams.get('status')).toLowerCase();
    if (status) return status === 'all' || status === 'acknowledged';
    const all = searchParams.get('all') ?? searchParams.get('includeAcknowledged');
    return all !== null && all !== '0' && all.toLowerCase() !== 'false';
}

export function buildOwnerReminderIdempotencyKey(input: {
    readonly companyId: string;
    readonly ownerAccountId: string;
    readonly sourceType: OwnerReminderSourceType;
    readonly sourceId: string;
    readonly reminderKind: string;
}): string {
    return `${buildOwnerPhase3SourceKey({
        companyId: input.companyId,
        locationId: null,
        ownerAccountId: input.ownerAccountId,
        sourceType: input.sourceType,
        sourceId: input.sourceId
    })}:${input.ownerAccountId}:${input.reminderKind}`;
}

export function buildOwnerReminderPortalEvent(input: {
    readonly reminder: Pick<OwnerReminderRow, 'id' | 'company_id' | 'location_id' | 'owner_account_id' | 'source_type' | 'source_id' | 'reminder_kind'>;
    readonly eventType: OwnerReminderEventType;
    readonly occurredAt: string;
    readonly actorId: string | null;
}): OwnerReminderPortalEventRow {
    return {
        company_id: input.reminder.company_id,
        location_id: input.reminder.location_id,
        owner_account_id: input.reminder.owner_account_id,
        source_type: input.reminder.source_type,
        source_id: input.reminder.source_id,
        event_type: input.eventType,
        event_data: {
            reminder_id: input.reminder.id,
            reminder_kind: input.reminder.reminder_kind,
            actor_id: input.actorId
        },
        occurred_at: input.occurredAt
    };
}

export function summarizeOwnerReminders(rows: readonly OwnerReminderRow[]): OwnerReminderStats {
    const bySourceType: Record<OwnerReminderSourceType, number> = { checklist_issue: 0, content_item: 0 };
    const byLocation = new Map<string, { locationId: string; total: number; acknowledged: number; unacknowledged: number }>();
    const ownerIds = new Set<string>();
    let acknowledged = 0;
    for (const row of rows) {
        ownerIds.add(row.owner_account_id);
        bySourceType[row.source_type] += 1;
        const location = byLocation.get(row.location_id) || { locationId: row.location_id, total: 0, acknowledged: 0, unacknowledged: 0 };
        location.total += 1;
        if (row.acknowledged_at) {
            acknowledged += 1;
            location.acknowledged += 1;
        } else {
            location.unacknowledged += 1;
        }
        byLocation.set(row.location_id, location);
    }
    return {
        total: rows.length,
        acknowledged,
        unacknowledged: rows.length - acknowledged,
        ownerCount: ownerIds.size,
        bySourceType,
        byLocation: Array.from(byLocation.values())
    };
}
