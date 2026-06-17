import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldReportAuthCheckFailure } from './userUtils';

test('Given expected auth failure statuses When checking reportability Then 401 and 403 stay quiet', () => {
    assert.equal(shouldReportAuthCheckFailure(401), false);
    assert.equal(shouldReportAuthCheckFailure(403), false);
});

test('Given unexpected auth check failures When checking reportability Then server errors are reported', () => {
    assert.equal(shouldReportAuthCheckFailure(500), true);
    assert.equal(shouldReportAuthCheckFailure(0), true);
});
