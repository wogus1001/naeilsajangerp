import type { RequesterProfile } from '@/lib/api-auth';
import { isPartnerVendorRole } from '@/lib/franchise-location-access';

const BRAND_EMPLOYEE_ROLES = new Set(['manager', 'sub_manager', 'staff']);

export type FranchiseLeadAccessRow = {
    readonly company_id: string | null;
    readonly manager_id?: string | null;
    readonly created_by?: string | null;
};

export function canAccessFranchiseLead(
    requester: RequesterProfile | null,
    lead: FranchiseLeadAccessRow | null | undefined
): boolean {
    if (!requester || !lead) return false;
    if (requester.role === 'admin') return true;

    if (isPartnerVendorRole(requester.role)) {
        return Boolean(lead.created_by && lead.created_by === requester.id);
    }

    if (!requester.company_id || !lead.company_id || requester.company_id !== lead.company_id) return false;
    return BRAND_EMPLOYEE_ROLES.has(requester.role || '');
}

export function shouldRestrictFranchiseLeadListToCreator(requester: RequesterProfile | null): boolean {
    return isPartnerVendorRole(requester?.role);
}
