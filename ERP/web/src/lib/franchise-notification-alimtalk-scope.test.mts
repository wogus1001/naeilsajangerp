import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canDispatchFranchiseNotificationAlimtalk } from './franchise-notification-alimtalk-scope.js';

test('Given admin global notification sync When company scope is missing Then AlimTalk dispatch is blocked', () => {
    assert.equal(canDispatchFranchiseNotificationAlimtalk({
        companyId: null,
        requesterIsAdmin: true
    }), false);
});

test('Given scoped notification sync When company scope exists Then AlimTalk dispatch is allowed', () => {
    assert.equal(canDispatchFranchiseNotificationAlimtalk({
        companyId: 'company-1',
        requesterIsAdmin: true
    }), true);
    assert.equal(canDispatchFranchiseNotificationAlimtalk({
        companyId: 'company-1',
        requesterIsAdmin: false
    }), true);
});
