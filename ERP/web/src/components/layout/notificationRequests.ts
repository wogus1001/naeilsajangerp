import type { StoredUser } from '@/utils/userUtils';
import { getRequesterId, getStoredCompanyName } from '@/utils/userUtils';

export type HeaderNotification = {
    readonly id: string;
    readonly severity: 'info' | 'warning' | 'danger' | 'success';
    readonly title: string;
    readonly body: string;
    readonly actionUrl: string;
    readonly dueAt: string | null;
    readonly readAt: string | null;
};

export type HeaderNotificationResponse = {
    readonly notifications: readonly HeaderNotification[];
    readonly unreadCount: number;
    readonly schemaReady: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseNotification(value: unknown): HeaderNotification | null {
    if (!isRecord(value)) return null;
    if (typeof value.id !== 'string' || typeof value.title !== 'string') return null;
    const severity = value.severity === 'warning' || value.severity === 'danger' || value.severity === 'success'
        ? value.severity
        : 'info';
    return {
        id: value.id,
        severity,
        title: value.title,
        body: typeof value.body === 'string' ? value.body : '',
        actionUrl: typeof value.actionUrl === 'string' ? value.actionUrl : '',
        dueAt: typeof value.dueAt === 'string' ? value.dueAt : null,
        readAt: typeof value.readAt === 'string' ? value.readAt : null
    };
}

export function filterUnreadHeaderNotifications(notifications: readonly HeaderNotification[]): readonly HeaderNotification[] {
    return notifications.filter(notification => !notification.readAt);
}

export async function fetchHeaderNotifications(user: StoredUser): Promise<HeaderNotificationResponse> {
    const requesterId = getRequesterId(user);
    if (!requesterId) return { notifications: [], unreadCount: 0, schemaReady: true };

    const params = new URLSearchParams({ requesterId, limit: '8' });
    const companyName = getStoredCompanyName(user);
    if (companyName) params.set('companyName', companyName);

    const response = await fetch(`/api/franchise-notifications?${params.toString()}`, { cache: 'no-store' });
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
    await fetch(`/api/franchise-notifications?${params.toString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
    });
}

export async function markAllHeaderNotificationsRead(user: StoredUser): Promise<void> {
    const requesterId = getRequesterId(user);
    if (!requesterId) return;
    const params = new URLSearchParams({ requesterId });
    await fetch(`/api/franchise-notifications?${params.toString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
    });
}
