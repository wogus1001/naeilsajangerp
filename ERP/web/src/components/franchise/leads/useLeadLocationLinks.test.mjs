import assert from 'node:assert/strict';
import { test } from 'node:test';
import leadLocationLinksModule from './useLeadLocationLinks.ts';

const { isLeadLocationTargetAbort } = leadLocationLinksModule;

test('isLeadLocationTargetAbort treats cleanup abort errors as quiet cancellations', () => {
    assert.equal(isLeadLocationTargetAbort(new DOMException('cleanup', 'AbortError')), true);
    assert.equal(isLeadLocationTargetAbort(Object.assign(new Error('signal is aborted without reason'), { name: 'AbortError' })), true);
    assert.equal(isLeadLocationTargetAbort(new Error('network failed')), false);
});
