import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import type { AssignableAdminUserRole } from './AdminUserRoleSelect';

export type AdminUserRow = {
    readonly id: string | null;
    readonly uuid: string;
    readonly name: string | null;
    readonly companyName: string | null;
    readonly role: string | null;
    readonly status: string | null;
    readonly joinedAt: string | null;
};

type AdminUserErrorResponse = {
    readonly error?: string;
};

function usersUrl(requesterId: string, extraParams?: Record<string, string>): string {
    const params = new URLSearchParams();
    if (requesterId) params.set('requesterId', requesterId);
    for (const [key, value] of Object.entries(extraParams || {})) {
        if (value) params.set(key, value);
    }
    const query = params.toString();
    return `/api/users${query ? `?${query}` : ''}`;
}

async function readError(response: Response, fallback: string): Promise<string> {
    try {
        const data = await response.json() as AdminUserErrorResponse;
        return data.error || fallback;
    } catch {
        return fallback;
    }
}

export async function fetchAdminUsers(requesterId: string): Promise<readonly AdminUserRow[]> {
    const response = await fetch(usersUrl(requesterId), {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    if (!response.ok) throw new Error(await readError(response, '회원 목록을 불러오지 못했습니다.'));
    return await response.json() as readonly AdminUserRow[];
}

export async function approveAdminUser(requesterId: string, userId: string): Promise<void> {
    const response = await fetch(usersUrl(requesterId), {
        method: 'PUT',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: userId, status: 'active' })
    });
    if (!response.ok) throw new Error(await readError(response, '승인 처리 실패'));
}

export async function updateAdminUserRole(
    requesterId: string,
    userId: string,
    role: AssignableAdminUserRole
): Promise<void> {
    const response = await fetch(usersUrl(requesterId), {
        method: 'PUT',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: userId, role })
    });
    if (!response.ok) throw new Error(await readError(response, '직급 변경 실패'));
}

export async function deleteAdminUser(requesterId: string, userId: string): Promise<void> {
    const response = await fetch(usersUrl(requesterId, { id: userId }), {
        method: 'DELETE',
        headers: await getApiAuthHeaders()
    });
    if (!response.ok) throw new Error(await readError(response, '삭제 실패'));
}
