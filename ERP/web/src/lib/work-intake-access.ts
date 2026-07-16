import type { RequesterProfile } from '@/lib/api-auth';

export type WorkIntakeAccessRow = {
    readonly company_id: string | null;
    readonly manager_id?: string | null;
    readonly created_by?: string | null;
};

function isSameCompanyTeamLead(requester: RequesterProfile, row: WorkIntakeAccessRow): boolean {
    return requester.role === 'manager'
        && Boolean(requester.company_id)
        && Boolean(row.company_id)
        && requester.company_id === row.company_id;
}

function isAuthor(requester: RequesterProfile, row: WorkIntakeAccessRow): boolean {
    const authorId = row.created_by || row.manager_id || null;
    return Boolean(
        authorId
        && authorId === requester.id
        && requester.company_id
        && row.company_id
        && requester.company_id === row.company_id
    );
}

export function canEditWorkIntakeRecord(
    requester: RequesterProfile | null,
    row: WorkIntakeAccessRow | null | undefined
): boolean {
    if (!requester || !row) return false;
    if (requester.role === 'admin') return true;
    return isAuthor(requester, row) || isSameCompanyTeamLead(requester, row);
}

export function canDeleteWorkIntakeRecord(
    requester: RequesterProfile | null,
    row: WorkIntakeAccessRow | null | undefined
): boolean {
    if (!requester || !row) return false;
    if (requester.role === 'admin') return true;
    return isAuthor(requester, row) || isSameCompanyTeamLead(requester, row);
}

export const canManageWorkIntakeRecord = canEditWorkIntakeRecord;
