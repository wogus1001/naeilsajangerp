import type { RequesterProfile } from './api-auth';

type ScheduleAccessFacts = {
    readonly assigneeProfileId?: string | null;
    readonly companyId?: string | null;
    readonly metadata?: unknown;
    readonly scope?: string | null;
    readonly sourceType?: string | null;
    readonly userId?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function targetProfileIds(metadata: unknown): readonly string[] {
    if (!isRecord(metadata) || !Array.isArray(metadata.targetProfileIds)) return [];
    return metadata.targetProfileIds.filter((value): value is string => typeof value === 'string');
}

export function canReadSchedule(requester: RequesterProfile, schedule: ScheduleAccessFacts): boolean {
    if (requester.role === 'admin') return true;

    if (schedule.sourceType === 'approval-document') {
        if (requester.role === 'partner_vendor') return false;
        return schedule.userId === requester.id ||
            schedule.assigneeProfileId === requester.id ||
            targetProfileIds(schedule.metadata).includes(requester.id);
    }

    if (schedule.scope === 'personal') return schedule.userId === requester.id;
    if (requester.company_id && schedule.companyId === requester.company_id) return true;
    return schedule.userId === requester.id;
}
