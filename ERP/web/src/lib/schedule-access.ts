import type { RequesterProfile } from './api-auth';

type ScheduleAccessFacts = {
    readonly approvalAccessGranted?: boolean;
    readonly assigneeProfileId?: string | null;
    readonly companyId?: string | null;
    readonly metadata?: unknown;
    readonly scope?: string | null;
    readonly sourceType?: string | null;
    readonly userId?: string | null;
};

export function canReadSchedule(requester: RequesterProfile, schedule: ScheduleAccessFacts): boolean {
    if (requester.role === 'admin') return true;

    if (schedule.sourceType === 'approval-document') {
        if (requester.role === 'partner_vendor') return false;
        return schedule.approvalAccessGranted === true;
    }

    if (schedule.scope === 'personal') return schedule.userId === requester.id;
    if (requester.company_id && schedule.companyId === requester.company_id) return true;
    return schedule.userId === requester.id;
}
