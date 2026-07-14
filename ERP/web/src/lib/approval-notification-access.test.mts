import assert from 'node:assert/strict';
import { test } from 'node:test';
import { staleApprovalNotificationIds } from './approval-notification-access.js';

void test('Given a revoked delegate notification When the document is no longer actionable Then only the stale step alert is dismissed', () => {
    const notifications = [
        { id: 'stale', data: { documentId: 'document-1', stepOrder: 1 } },
        { id: 'active', data: { documentId: 'document-1', stepOrder: 2 } },
        { id: 'shared', data: { documentId: 'document-1' } }
    ];

    assert.deepEqual(staleApprovalNotificationIds(notifications, new Set(['document-1:2'])), ['stale']);
});
