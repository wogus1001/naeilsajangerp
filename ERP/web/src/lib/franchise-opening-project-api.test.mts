import assert from 'node:assert/strict';
import { test } from 'node:test';

import { requesterFallback } from './franchise-opening-project-api.js';

test('requesterFallback preserves legacy opening-project requester fields', () => {
    assert.equal(requesterFallback({ requesterId: 'requester-1' }), 'requester-1');
    assert.equal(requesterFallback({ userId: 'user-1' }), 'user-1');
    assert.equal(requesterFallback({ manager_id: 'manager-1' }), 'manager-1');
    assert.equal(requesterFallback({ unknown: 'none' }), null);
});
