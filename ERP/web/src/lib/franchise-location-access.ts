import type { RequesterProfile } from '@/lib/api-auth';

export const PARTNER_VENDOR_ROLE = 'partner_vendor';

const BRAND_EMPLOYEE_ROLES = new Set(['manager', 'sub_manager', 'staff']);

export type FranchiseLocationAccessRow = {
    readonly company_id: string | null;
    readonly manager_id?: string | null;
    readonly created_by?: string | null;
};

export function isPartnerVendorRole(role: string | null | undefined): boolean {
    return role === PARTNER_VENDOR_ROLE;
}

export function canAccessFranchiseLocation(
    requester: RequesterProfile | null,
    location: FranchiseLocationAccessRow | null | undefined
): boolean {
    if (!requester || !location) return false;
    if (requester.role === 'admin') return true;

    if (isPartnerVendorRole(requester.role)) {
        return Boolean(location.created_by && location.created_by === requester.id);
    }

    if (location.manager_id && location.manager_id === requester.id) return true;
    if (!requester.company_id || !location.company_id || requester.company_id !== location.company_id) return false;

    return BRAND_EMPLOYEE_ROLES.has(requester.role || '');
}

export function shouldRestrictFranchiseLocationListToCreator(requester: RequesterProfile | null): boolean {
    return isPartnerVendorRole(requester?.role);
}
