import assert from 'node:assert/strict';
import test from 'node:test';

const subject = await import('./headerNotificationDataSource.js').catch(() => null);

const controlledSource = {
    load: async () => ({
        notifications: [],
        unreadCount: 0,
        schemaReady: true
    }),
    markOneRead: async () => undefined,
    markAllRead: async () => undefined,
    navigate: () => undefined
};

test('getHeaderNotificationPollingInterval keeps production polling without a controlled source', () => {
    // Given
    const dataSource = undefined;

    // When
    assert.ok(subject, 'header notification data-source policy must be exported');
    const interval = subject.getHeaderNotificationPollingInterval(dataSource);

    // Then
    assert.equal(interval, 60_000);
});

test('getHeaderNotificationPollingInterval disables polling for a controlled source', () => {
    // Given
    const dataSource = controlledSource;

    // When
    assert.ok(subject, 'header notification data-source policy must be exported');
    const interval = subject.getHeaderNotificationPollingInterval(dataSource);

    // Then
    assert.equal(interval, null);
});

test('navigateToSafeHeaderNotificationAction forwards a safe root-relative URL', () => {
    // Given
    let navigatedTo = '';

    // When
    assert.ok(subject, 'safe notification navigation must be exported');
    const didNavigate = subject.navigateToSafeHeaderNotificationAction(
        '/approvals/documents/document-1?tab=history#event-2',
        safeUrl => {
            navigatedTo = safeUrl;
        }
    );

    // Then
    assert.equal(didNavigate, true);
    assert.equal(navigatedTo, '/approvals/documents/document-1?tab=history#event-2');
});

test('navigateToSafeHeaderNotificationAction blocks an unsafe URL', () => {
    // Given
    let navigationCount = 0;

    // When
    assert.ok(subject, 'safe notification navigation must be exported');
    const didNavigate = subject.navigateToSafeHeaderNotificationAction(
        'javascript:alert(1)',
        () => {
            navigationCount += 1;
        }
    );

    // Then
    assert.equal(didNavigate, false);
    assert.equal(navigationCount, 0);
});
