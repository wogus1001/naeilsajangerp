import type { AdminUserRow } from './adminUsersRequests';

export type AdminUserStatusFilter = 'all' | 'active' | 'pending_approval' | 'blocked' | 'empty';
export type AdminUserRoleFilter = 'all' | 'admin' | 'manager' | 'sub_manager' | 'partner_vendor' | 'staff' | 'empty';
export type AdminUserSortKey = 'joinedAt' | 'name' | 'loginId' | 'companyName' | 'role' | 'status';
export type AdminUserSortDirection = 'asc' | 'desc';

export type AdminUserTableState = {
    readonly query: string;
    readonly status: AdminUserStatusFilter;
    readonly role: AdminUserRoleFilter;
    readonly company: string;
    readonly sortKey: AdminUserSortKey;
    readonly sortDirection: AdminUserSortDirection;
};

export function parseAdminUserStatusFilter(value: string): AdminUserStatusFilter {
    switch (value) {
        case 'active':
        case 'pending_approval':
        case 'blocked':
        case 'empty':
            return value;
        default:
            return 'all';
    }
}

export function parseAdminUserRoleFilter(value: string): AdminUserRoleFilter {
    switch (value) {
        case 'admin':
        case 'manager':
        case 'sub_manager':
        case 'partner_vendor':
        case 'staff':
        case 'empty':
            return value;
        default:
            return 'all';
    }
}

export function parseAdminUserSortKey(value: string): AdminUserSortKey {
    switch (value) {
        case 'name':
        case 'loginId':
        case 'companyName':
        case 'role':
        case 'status':
            return value;
        default:
            return 'joinedAt';
    }
}

export function parseAdminUserSortDirection(value: string): AdminUserSortDirection {
    return value === 'asc' ? 'asc' : 'desc';
}

function normalized(value: string | null): string {
    return (value || '').toLocaleLowerCase('ko-KR');
}

function matchesSearch(user: AdminUserRow, query: string): boolean {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
    if (!normalizedQuery) return true;
    return [
        user.name,
        user.loginId,
        user.id,
        user.companyName,
        user.role,
        user.status
    ].some(value => normalized(value).includes(normalizedQuery));
}

function matchesStatus(user: AdminUserRow, status: AdminUserStatusFilter): boolean {
    if (status === 'all') return true;
    if (status === 'empty') return !user.status;
    return user.status === status;
}

function matchesRole(user: AdminUserRow, role: AdminUserRoleFilter): boolean {
    if (role === 'all') return true;
    if (role === 'empty') return !user.role;
    return user.role === role;
}

function matchesCompany(user: AdminUserRow, company: string): boolean {
    if (!company) return true;
    return user.companyName === company;
}

function sortValue(user: AdminUserRow, key: AdminUserSortKey): string {
    switch (key) {
        case 'name':
            return user.name || '';
        case 'loginId':
            return user.loginId || user.id || '';
        case 'companyName':
            return user.companyName || '';
        case 'role':
            return user.role || '';
        case 'status':
            return user.status || '';
        case 'joinedAt':
            return user.joinedAt || '';
    }
}

export function filterAndSortAdminUsers(
    users: readonly AdminUserRow[],
    state: AdminUserTableState
): readonly AdminUserRow[] {
    return users
        .filter(user => matchesSearch(user, state.query))
        .filter(user => matchesStatus(user, state.status))
        .filter(user => matchesRole(user, state.role))
        .filter(user => matchesCompany(user, state.company))
        .toSorted((left, right) => {
            const comparison = sortValue(left, state.sortKey).localeCompare(sortValue(right, state.sortKey), 'ko-KR');
            return state.sortDirection === 'asc' ? comparison : -comparison;
        });
}

export function countPendingAdminUsers(users: readonly AdminUserRow[]): number {
    return users.filter(user => user.status === 'pending_approval').length;
}

export function getAdminUserCompanyOptions(users: readonly AdminUserRow[]): readonly string[] {
    const companies = users
        .map(user => user.companyName)
        .filter((name): name is string => Boolean(name && name !== '-'));
    return [...new Set(companies)].toSorted((left, right) => left.localeCompare(right, 'ko-KR'));
}

export function pageAdminUsers(users: readonly AdminUserRow[], page: number, pageSize: number): readonly AdminUserRow[] {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const start = (safePage - 1) * safePageSize;
    return users.slice(start, start + safePageSize);
}
