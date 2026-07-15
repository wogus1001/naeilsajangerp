import type { StoredUser } from '@/utils/userUtils';
import { getRequesterId, getStoredCompanyName } from '@/utils/userUtils';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';

export type HeaderNotification = {
    readonly id: string;
    readonly category: HeaderNotificationCategory;
    readonly sourceType: string;
    readonly severity: 'info' | 'warning' | 'danger' | 'success';
    readonly title: string;
    readonly body: string;
    readonly actionUrl: string;
    readonly dueAt: string | null;
    readonly readAt: string | null;
};

export type HeaderNotificationCategory = 'approval' | 'franchise' | 'system';

export type HeaderNotificationResponse = {
    readonly notifications: readonly HeaderNotification[];
    readonly unreadCount: number;
    readonly schemaReady: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getHeaderNotificationCategory(sourceType: string): HeaderNotificationCategory {
    if (sourceType === 'workflow-approval') return 'approval';
    if (sourceType === 'system') return 'system';
    return 'franchise';
}

export function getSafeHeaderNotificationActionUrl(value: string): string | null {
    if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
    try {
        const baseUrl = new URL('https://notification.local');
        const targetUrl = new URL(value, baseUrl);
        if (targetUrl.origin !== baseUrl.origin) return null;
        return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    } catch {
        return null;
    }
}

function parseNotification(value: unknown): HeaderNotification | null {
    if (!isRecord(value)) return null;
    if (typeof value.id !== 'string' || typeof value.title !== 'string') return null;
    const severity = value.severity === 'warning' || value.severity === 'danger' || value.severity === 'success'
        ? value.severity
        : 'info';
    const sourceType = typeof value.sourceType === 'string' ? value.sourceType : 'system';
    return {
        id: value.id,
        category: getHeaderNotificationCategory(sourceType),
        sourceType,
        severity,
        title: value.title,
        body: typeof value.body === 'string' ? value.body : '',
        actionUrl: typeof value.actionUrl === 'string' ? getSafeHeaderNotificationActionUrl(value.actionUrl) ?? '' : '',
        dueAt: typeof value.dueAt === 'string' ? value.dueAt : null,
        readAt: typeof value.readAt === 'string' ? value.readAt : null
    };
}

export function filterUnreadHeaderNotifications(notifications: readonly HeaderNotification[]): readonly HeaderNotification[] {
    return notifications.filter(notification => !notification.readAt);
}

export async function fetchHeaderNotifications(
    user: StoredUser,
    category: 'all' | HeaderNotificationCategory = 'all'
): Promise<HeaderNotificationResponse> {
    const requesterId = getRequesterId(user);
    if (!requesterId) return { notifications: [], unreadCount: 0, schemaReady: true };

    const params = new URLSearchParams({ requesterId, limit: '8' });
    if (category !== 'all') params.set('category', category);
    const companyName = getStoredCompanyName(user);
    if (companyName) params.set('companyName', companyName);

    const response = await fetch(`/api/franchise-notifications?${params.toString()}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch notifications');
    const payload: unknown = await response.json();
    const data = isRecord(payload) && isRecord(payload.data) ? payload.data : {};
    const rawNotifications = Array.isArray(data.notifications) ? data.notifications : [];
    const notifications = rawNotifications.map(parseNotification).filter((item): item is HeaderNotification => item !== null);
    return {
        notifications: filterUnreadHeaderNotifications(notifications),
        unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
        schemaReady: typeof data.schemaReady === 'boolean' ? data.schemaReady : true
    };
}

export async function markHeaderNotificationRead(user: StoredUser, notificationId: string): Promise<void> {
    const requesterId = getRequesterId(user);
    if (!requesterId) return;
    const params = new URLSearchParams({ requesterId });
    const companyName = getStoredCompanyName(user);
    if (companyName) params.set('companyName', companyName);
    const response = await fetch(`/api/franchise-notifications?${params.toString()}`, {
        method: 'PATCH',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ notificationId })
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
}

export async function markAllHeaderNotificationsRead(user: StoredUser): Promise<void> {
    const requesterId = getRequesterId(user);
    if (!requesterId) return;
    const params = new URLSearchParams({ requesterId });
    const companyName = getStoredCompanyName(user);
    if (companyName) params.set('companyName', companyName);
    const response = await fetch(`/api/franchise-notifications?${params.toString()}`, {
        method: 'PATCH',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ markAllRead: true })
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
}
