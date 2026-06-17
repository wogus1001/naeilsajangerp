"use client";

import {
    ADMIN_ASSIGNABLE_USER_ROLES,
    getUserRoleLabel,
    normalizeAdminAssignableUserRole,
    normalizeUserRole,
    type AdminAssignableUserRole,
    type UserRole
} from '@/lib/user-role-policy';

export type AdminUserRole = UserRole;
export type AssignableAdminUserRole = AdminAssignableUserRole;

export function normalizeAdminUserRole(value: string | null | undefined): AdminUserRole | null {
    return normalizeUserRole(value);
}

export function getAdminUserRoleLabel(value: AdminUserRole | string | null | undefined): string {
    return getUserRoleLabel(value);
}

type AdminUserRoleSelectProps = {
    readonly role: string | null | undefined;
    readonly userName: string;
    readonly isUpdating: boolean;
    readonly onChange: (role: AssignableAdminUserRole) => void;
};

export function AdminUserRoleSelect({ role, userName, isUpdating, onChange }: AdminUserRoleSelectProps) {
    const normalizedRole = normalizeAdminUserRole(role);
    const assignableRole = normalizeAdminAssignableUserRole(normalizedRole);
    const selectedValue = assignableRole ?? '';
    const shouldShowReadonlyRole = Boolean(normalizedRole && !assignableRole);

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            {shouldShowReadonlyRole && (
                <span style={{ color: '#8b95a1', fontSize: '11px', fontWeight: 700 }}>
                    현재 {getAdminUserRoleLabel(normalizedRole)}
                </span>
            )}
            <select
                aria-label={`${userName} 직급 변경`}
                value={selectedValue}
                disabled={isUpdating}
                onChange={event => {
                    const nextRole = normalizeAdminAssignableUserRole(event.target.value);
                    if (nextRole) onChange(nextRole);
                }}
                style={{
                    minWidth: '124px',
                    height: '34px',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    backgroundColor: isUpdating ? '#f8f9fa' : '#ffffff',
                    color: '#343a40',
                    fontSize: '13px',
                    fontWeight: 700,
                    padding: '0 10px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer'
                }}
            >
                {!assignableRole && <option value="" disabled>직급 변경</option>}
                {ADMIN_ASSIGNABLE_USER_ROLES.map(roleOption => (
                    <option key={roleOption} value={roleOption}>
                        {getUserRoleLabel(roleOption)}
                    </option>
                ))}
            </select>
        </div>
    );
}
