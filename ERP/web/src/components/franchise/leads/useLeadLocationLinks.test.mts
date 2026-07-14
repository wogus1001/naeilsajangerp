import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLeadLocationRequestAbort } from './useLeadLocationLinks.js';

test('lead location request cleanup recognizes abort errors only', () => {
    const abortError = new Error('signal is aborted without reason');
    abortError.name = 'AbortError';

    assert.equal(isLeadLocationRequestAbort(abortError), true);
    assert.equal(isLeadLocationRequestAbort(new Error('network failed')), false);
    assert.equal(isLeadLocationRequestAbort('AbortError'), false);
});
