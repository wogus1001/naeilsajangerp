import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';

export type DashboardNotice = {
    readonly id?: string | number;
    readonly title?: string;
    readonly createdAt?: string;
    readonly type?: string;
    readonly isPinned?: boolean;
};

export function normalizeDashboardNotices(payload: unknown): DashboardNotice[] {
    if (!Array.isArray(payload)) return [];

    return payload.flatMap(value => {
        const notice = normalizeDashboardNotice(value);
        return notice ? [notice] : [];
    });
}

export async function fetchDashboardNotices(companyName: string): Promise<DashboardNotice[]> {
    try {
        const response = await fetch(`/api/notices?companyName=${encodeURIComponent(companyName || '')}&limit=5`, {
            headers: await getApiAuthHeaders()
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
            console.warn('Failed to fetch dashboard notices:', payload);
            return [];
        }
        return normalizeDashboardNotices(payload);
    } catch (error) {
        if (error instanceof Error) {
            console.error('Failed to fetch dashboard notices:', error.message);
        } else {
            console.error('Failed to fetch dashboard notices:', error);
        }
        return [];
    }
}

function normalizeDashboardNotice(value: unknown): DashboardNotice | null {
    if (!isRecord(value)) return null;

    return {
        id: normalizeNoticeId(value.id),
        title: normalizeString(value.title),
        createdAt: normalizeString(value.createdAt),
        type: normalizeString(value.type),
        isPinned: value.isPinned === true || value.is_pinned === true
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeNoticeId(value: unknown): string | number | undefined {
    if (typeof value === 'string' || typeof value === 'number') return value;
    return undefined;
}

function normalizeString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}
