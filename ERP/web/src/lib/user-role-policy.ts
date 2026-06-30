export const USER_ROLES = ['admin', 'manager', 'sub_manager', 'staff', 'partner_vendor'] as const;
export const ADMIN_ASSIGNABLE_USER_ROLES = ['manager', 'sub_manager', 'partner_vendor'] as const;
export const BRAND_STAFF_USER_ROLES = ['sub_manager', 'staff'] as const;

export type UserRole = typeof USER_ROLES[number];
export type AdminAssignableUserRole = typeof ADMIN_ASSIGNABLE_USER_ROLES[number];
export type BrandStaffUserRole = typeof BRAND_STAFF_USER_ROLES[number];

export function normalizeUserRole(value: string | null | undefined): UserRole | null {
    return USER_ROLES.find(role => role === value) ?? null;
}

export function normalizeAdminAssignableUserRole(value: string | null | undefined): AdminAssignableUserRole | null {
    return ADMIN_ASSIGNABLE_USER_ROLES.find(role => role === value) ?? null;
}

export function isBrandStaffUserRole(value: string | null | undefined): value is BrandStaffUserRole {
    return BRAND_STAFF_USER_ROLES.some(role => role === value);
}

export function getUserRoleLabel(value: UserRole | string | null | undefined): string {
    const role = normalizeUserRole(value);
    switch (role) {
        case 'admin':
            return '관리자';
        case 'manager':
            return '팀장';
        case 'sub_manager':
            return '매니저';
        case 'staff':
            return '담당자';
        case 'partner_vendor':
            return '협력업체';
        default:
            return '사용자';
    }
}
