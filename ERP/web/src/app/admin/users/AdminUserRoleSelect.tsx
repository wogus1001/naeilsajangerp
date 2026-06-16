"use client";

export type AdminUserRole = 'admin' | 'manager' | 'staff';

const ROLE_OPTIONS: ReadonlyArray<{ readonly value: AdminUserRole; readonly label: string }> = [
    { value: 'admin', label: '관리자' },
    { value: 'manager', label: '팀장/매니저' },
    { value: 'staff', label: '담당자' }
] as const;

export function normalizeAdminUserRole(value: string | null | undefined): AdminUserRole | null {
    return ROLE_OPTIONS.find(option => option.value === value)?.value ?? null;
}

export function getAdminUserRoleLabel(value: AdminUserRole | string | null | undefined): string {
    return ROLE_OPTIONS.find(option => option.value === value)?.label ?? '사용자';
}

type AdminUserRoleSelectProps = {
    readonly role: string | null | undefined;
    readonly userName: string;
    readonly isUpdating: boolean;
    readonly onChange: (role: AdminUserRole) => void;
};

export function AdminUserRoleSelect({ role, userName, isUpdating, onChange }: AdminUserRoleSelectProps) {
    const normalizedRole = normalizeAdminUserRole(role);

    return (
        <select
            aria-label={`${userName} 직급 변경`}
            value={normalizedRole ?? ''}
            disabled={isUpdating}
            onChange={event => onChange(event.target.value as AdminUserRole)}
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
            {!normalizedRole && <option value="" disabled>사용자</option>}
            {ROLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
