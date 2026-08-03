import {
    getSafeHeaderNotificationActionUrl,
    type HeaderNotificationCategory,
    type HeaderNotificationResponse
} from './notificationRequests';

export type HeaderNotificationFilter = 'all' | HeaderNotificationCategory;

export type HeaderNotificationDataSource = {
    readonly load: (
        category: HeaderNotificationFilter
    ) => HeaderNotificationResponse | Promise<HeaderNotificationResponse>;
    readonly markOneRead: (notificationId: string) => void | Promise<void>;
    readonly markAllRead: () => void | Promise<void>;
    readonly navigate: (actionUrl: string) => void;
};

export const HEADER_NOTIFICATION_POLL_INTERVAL_MS = 60_000;

export function getHeaderNotificationPollingInterval(
    dataSource?: HeaderNotificationDataSource
): number | null {
    return dataSource ? null : HEADER_NOTIFICATION_POLL_INTERVAL_MS;
}

export function navigateToSafeHeaderNotificationAction(
    actionUrl: string,
    navigate: (safeActionUrl: string) => void
): boolean {
    const safeActionUrl = getSafeHeaderNotificationActionUrl(actionUrl);
    if (!safeActionUrl) return false;
    navigate(safeActionUrl);
    return true;
}
