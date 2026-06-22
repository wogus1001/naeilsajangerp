import type { Company } from '../signup/CompanySearchModal';

const SAVED_LOGIN_ID_KEY = 'saved_login_id';
const SAVED_LOGIN_COMPANY_KEY = 'saved_login_company';

export type LoginCompany = Pick<Company, 'id' | 'name'> & Partial<Pick<Company, 'manager_name' | 'created_at'>>;

type LoginCompanySource = {
    readonly companyId?: string | null;
    readonly companyName?: string | null;
};

function canUseLocalStorage() {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function parseSavedLoginCompany(raw: string | null): LoginCompany | null {
    if (!raw) return null;

    try {
        const value = JSON.parse(raw) as unknown;
        if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return null;

        return {
            id: value.id,
            name: value.name,
            manager_name: typeof value.manager_name === 'string' ? value.manager_name : '',
            created_at: typeof value.created_at === 'string' ? value.created_at : ''
        };
    } catch {
        return null;
    }
}

export function readSavedLoginId() {
    if (!canUseLocalStorage()) return '';
    return window.localStorage.getItem(SAVED_LOGIN_ID_KEY) || '';
}

export function writeSavedLoginId(id: string, remember: boolean) {
    if (!canUseLocalStorage()) return;

    if (remember) {
        window.localStorage.setItem(SAVED_LOGIN_ID_KEY, id);
        return;
    }

    window.localStorage.removeItem(SAVED_LOGIN_ID_KEY);
}

export function readSavedLoginCompany() {
    if (!canUseLocalStorage()) return null;
    return parseSavedLoginCompany(window.localStorage.getItem(SAVED_LOGIN_COMPANY_KEY));
}

export function writeSavedLoginCompany(company: LoginCompany | null) {
    if (!canUseLocalStorage()) return;

    if (!company) {
        window.localStorage.removeItem(SAVED_LOGIN_COMPANY_KEY);
        return;
    }

    window.localStorage.setItem(SAVED_LOGIN_COMPANY_KEY, JSON.stringify({
        id: company.id,
        name: company.name,
        manager_name: company.manager_name || '',
        created_at: company.created_at || ''
    }));
}

export function getLoginCompanyFromUser(user: LoginCompanySource | undefined) {
    if (!user?.companyId || !user.companyName) return null;
    return { id: user.companyId, name: user.companyName };
}
