import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    fetchHeaderNotifications,
    filterUnreadHeaderNotifications,
    getHeaderNotificationCategory,
    getSafeHeaderNotificationActionUrl,
    markHeaderNotificationRead,
    type HeaderNotification
} from './notificationRequests.js';

const baseNotification = {
    id: 'notification-1',
    category: 'franchise',
    severity: 'warning',
    title: '연락 지연',
    body: '다음 연락 예정일이 지났습니다.',
    actionUrl: '/dashboard/franchise-leads?tab=db&leadId=lead-1',
    dueAt: '2026-06-14T00:00:00.000Z',
    sourceType: 'contact-overdue'
} satisfies Omit<HeaderNotification, 'readAt'>;

test('getHeaderNotificationCategory separates approval notifications from franchise operations', () => {
    assert.equal(getHeaderNotificationCategory('workflow-approval'), 'approval');
    assert.equal(getHeaderNotificationCategory('vendor-contract-due'), 'franchise');
});

test('getSafeHeaderNotificationActionUrl only accepts same-origin root-relative paths', () => {
    assert.equal(
        getSafeHeaderNotificationActionUrl('/approvals/documents/document-1?tab=history#event-2'),
        '/approvals/documents/document-1?tab=history#event-2'
    );
    assert.equal(getSafeHeaderNotificationActionUrl('javascript:alert(1)'), null);
    assert.equal(getSafeHeaderNotificationActionUrl('https://example.com/phishing'), null);
    assert.equal(getSafeHeaderNotificationActionUrl('//example.com/phishing'), null);
    assert.equal(getSafeHeaderNotificationActionUrl('/\\example.com/phishing'), null);
});

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
    let requestedUrl = '';
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    globalThis.fetch = async input => {
        requestedUrl = String(input);
        return new Response(JSON.stringify({
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
    };

    const result = await fetchHeaderNotifications({
        id: 'profile-1',
        companyName: '내일'
    }, 'approval');

    assert.deepEqual(
        result.notifications.map(notification => notification.id),
        ['notification-unread']
    );
    assert.equal(result.unreadCount, 1);
    assert.equal(result.notifications[0]?.category, 'franchise');
    assert.equal(new URL(requestedUrl, 'http://localhost').searchParams.get('category'), 'approval');
});

test('markHeaderNotificationRead throws when the API rejects the update', async t => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    globalThis.fetch = async () => new Response(JSON.stringify({
        error: { message: 'Forbidden' }
    }), {
        headers: { 'Content-Type': 'application/json' },
        status: 403
    });

    await assert.rejects(
        () => markHeaderNotificationRead({ id: 'profile-1' }, 'notification-1'),
        /Failed to mark notification as read/
    );
});
