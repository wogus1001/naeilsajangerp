import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLeadLocationTargetAbort } from './useLeadLocationLinks.js';

test('lead location request cleanup recognizes abort errors only', () => {
    const abortError = new Error('signal is aborted without reason');
    abortError.name = 'AbortError';

    assert.equal(isLeadLocationTargetAbort(abortError), true);
    assert.equal(isLeadLocationTargetAbort(new Error('network failed')), false);
    assert.equal(isLeadLocationTargetAbort('AbortError'), false);
});
