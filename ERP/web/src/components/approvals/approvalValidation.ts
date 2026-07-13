import type { ApprovalFieldValue } from './approvalTypes';

export function hasApprovalValue(value: ApprovalFieldValue | undefined): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number' || typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    return Object.values(value).some(item => item.trim().length > 0);
}
