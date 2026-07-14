import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLeadLocationRequestAbort, isLeadLocationRequestAbort } from './useLeadLocationLinks.js';

test('lead location request cleanup recognizes abort errors only', () => {
    const abortError = new Error('signal is aborted without reason');
    abortError.name = 'AbortError';

    assert.equal(isLeadLocationRequestAbort(abortError), true);
    assert.equal(isLeadLocationRequestAbort(new Error('network failed')), false);
    assert.equal(isLeadLocationRequestAbort('AbortError'), false);
});

test('lead location request cleanup supplies an explicit abort reason', () => {
    const abortReason = createLeadLocationRequestAbort();

    assert.equal(abortReason.name, 'AbortError');
    assert.equal(abortReason.message, 'Lead location link target request cancelled.');
});
