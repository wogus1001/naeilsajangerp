
export type StoredUser = {
    uid?: string;
    uuid?: string;
    id?: string;
    userId?: string;
    user_id?: string;
    name?: string;
    role?: string;
    managerName?: string;
    companyName?: string;
    company_name?: string;
    companyId?: string;
    company_id?: string;
    [key: string]: unknown;
} | null;

export type AdminCompanyScope = {
    readonly id: string;
    readonly name: string;
};

const ADMIN_COMPANY_SCOPE_KEY = 'admin_selected_company_scope';
export const ADMIN_COMPANY_SCOPE_CHANGE_EVENT = 'admin-company-scope-change';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAdminCompanyScope(value: unknown): AdminCompanyScope | null {
    if (!isRecord(value)) return null;
    if (typeof value.id !== 'string' || typeof value.name !== 'string') return null;
    const id = value.id.trim();
    const name = value.name.trim();
    if (!id || !name) return null;
    return { id, name };
}

export const isAdminStoredUser = (sourceUser?: StoredUser): boolean => {
    const user = sourceUser || getStoredUser();
    return user?.role === 'admin' || user?.role === 'super_admin';
};

export const getStoredUser = (): StoredUser => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
        const parsed = JSON.parse(userStr);
        return parsed?.user || parsed || null;
    } catch {
        return null; // Return null on parse error
    }
};

export const getAdminCompanyScope = (): AdminCompanyScope | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(ADMIN_COMPANY_SCOPE_KEY);
    if (!raw) return null;
    try {
        return parseAdminCompanyScope(JSON.parse(raw));
    } catch {
        return null;
    }
};

export const setAdminCompanyScope = (scope: AdminCompanyScope | null): void => {
    if (typeof window === 'undefined') return;

    if (!scope) {
        localStorage.removeItem(ADMIN_COMPANY_SCOPE_KEY);
    } else {
        localStorage.setItem(ADMIN_COMPANY_SCOPE_KEY, JSON.stringify(scope));
    }

    window.dispatchEvent(new Event(ADMIN_COMPANY_SCOPE_CHANGE_EVENT));
};

export const getRequesterId = (sourceUser?: StoredUser): string => {
    const user = sourceUser || getStoredUser();
    if (!user) return '';
    // Priority: uid > uuid > id > userId > user_id
    return user.uid || user.uuid || user.id || user.userId || user.user_id || '';
};

export const getStoredCompanyName = (sourceUser?: StoredUser): string => {
    const user = sourceUser || getStoredUser();
    if (!user) return '';
    const adminScope = isAdminStoredUser(user) ? getAdminCompanyScope() : null;
    if (adminScope?.name) return adminScope.name;
    return user.companyName || user.company_name || '';
};

export const getStoredCompanyId = (sourceUser?: StoredUser): string => {
    const user = sourceUser || getStoredUser();
    if (!user) return '';
    const adminScope = isAdminStoredUser(user) ? getAdminCompanyScope() : null;
    if (adminScope?.id) return adminScope.id;
    return user.companyId || user.company_id || '';
};
