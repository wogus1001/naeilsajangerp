import { getUserRoleLabel } from '@/lib/user-role-policy';

export type ManagerDisplayProfile = {
    readonly id?: string;
    readonly uuid?: string;
    readonly name?: string;
    readonly role?: string | null;
    readonly companyName?: string;
};

export function formatManagerDisplayName(manager: ManagerDisplayProfile): string {
    const baseName = manager.name || manager.id || manager.uuid || '담당자 미상';
    return manager.role === 'partner_vendor'
        ? `${getUserRoleLabel(manager.role)}-${baseName}`
        : baseName;
}

export function formatManagerOptionLabel(manager: ManagerDisplayProfile, includeCompanyName = false): string {
    const displayName = formatManagerDisplayName(manager);
    return includeCompanyName && manager.companyName ? `${displayName} · ${manager.companyName}` : displayName;
}
