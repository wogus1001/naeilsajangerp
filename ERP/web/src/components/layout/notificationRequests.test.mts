import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    fetchHeaderNotifications,
    filterUnreadHeaderNotifications,
    type HeaderNotification
} from './notificationRequests.js';

const baseNotification = {
    id: 'notification-1',
    severity: 'warning',
    title: '연락 지연',
    body: '다음 연락 예정일이 지났습니다.',
    actionUrl: '/dashboard/franchise-leads?tab=db&leadId=lead-1',
    dueAt: '2026-06-14T00:00:00.000Z'
} satisfies Omit<HeaderNotification, 'readAt'>;

test('filterUnreadHeaderNotifications hides read notifications from the header list', () => {
    const notifications: readonly HeaderNotification[] = [
        { ...baseNotification, id: 'notification-read', readAt: '2026-06-17T00:00:00.000Z' },
        { ...baseNotification, id: 'notification-unread', readAt: null }
    ];

    assert.deepEqual(
        filterUnreadHeaderNotifications(notifications).map(notification => notification.id),
        ['notification-unread']
    );
});

test('fetchHeaderNotifications returns only unread notifications to the header', async t => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    globalThis.fetch = async () => new Response(JSON.stringify({
        data: {
            notifications: [
                { ...baseNotification, id: 'notification-read', readAt: '2026-06-17T00:00:00.000Z' },
                { ...baseNotification, id: 'notification-unread', readAt: null }
            ],
            schemaReady: true,
            unreadCount: 1
        }
    }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
    });

    const result = await fetchHeaderNotifications({
        id: 'profile-1',
        companyName: '내일'
    });

    assert.deepEqual(
        result.notifications.map(notification => notification.id),
        ['notification-unread']
    );
    assert.equal(result.unreadCount, 1);
});
