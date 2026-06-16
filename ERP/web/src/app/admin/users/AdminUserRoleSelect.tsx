"use client";

export type AdminUserRole = 'admin' | 'manager' | 'sub_manager' | 'staff';
export type AssignableAdminUserRole = 'manager' | 'sub_manager';

const ALL_ROLE_OPTIONS: ReadonlyArray<{ readonly value: AdminUserRole; readonly label: string }> = [
    { value: 'admin', label: '관리자' },
    { value: 'manager', label: '팀장' },
    { value: 'sub_manager', label: '매니저' },
    { value: 'staff', label: '담당자' }
] as const;

const ASSIGNABLE_ROLE_OPTIONS: ReadonlyArray<{ readonly value: AssignableAdminUserRole; readonly label: string }> = [
    { value: 'manager', label: '팀장' },
    { value: 'sub_manager', label: '매니저' }
] as const;

export function normalizeAdminUserRole(value: string | null | undefined): AdminUserRole | null {
    return ALL_ROLE_OPTIONS.find(option => option.value === value)?.value ?? null;
}

function normalizeAssignableAdminUserRole(value: string | null | undefined): AssignableAdminUserRole | null {
    return ASSIGNABLE_ROLE_OPTIONS.find(option => option.value === value)?.value ?? null;
}

export function getAdminUserRoleLabel(value: AdminUserRole | string | null | undefined): string {
    const normalizedRole = normalizeAdminUserRole(value);
    return ALL_ROLE_OPTIONS.find(option => option.value === normalizedRole)?.label ?? '사용자';
}

type AdminUserRoleSelectProps = {
    readonly role: string | null | undefined;
    readonly userName: string;
    readonly isUpdating: boolean;
    readonly onChange: (role: AssignableAdminUserRole) => void;
};

export function AdminUserRoleSelect({ role, userName, isUpdating, onChange }: AdminUserRoleSelectProps) {
    const normalizedRole = normalizeAdminUserRole(role);
    const assignableRole = normalizeAssignableAdminUserRole(normalizedRole);
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
                    const nextRole = normalizeAssignableAdminUserRole(event.target.value);
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
                {ASSIGNABLE_ROLE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
