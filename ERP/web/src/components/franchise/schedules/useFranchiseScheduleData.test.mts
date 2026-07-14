import assert from 'node:assert/strict';
import { test } from 'node:test';
import { franchiseScheduleMonthRange } from './useFranchiseScheduleData.js';

test('Given December When calculating the visible calendar range Then the range continues into January', () => {
    const range = franchiseScheduleMonthRange(new Date(2026, 11, 15));

    assert.deepEqual(range, {
        from: '2026-12-01',
        to: '2027-01-07'
    });
});

test('Given a leap-year February When calculating the visible calendar range Then the next month is used', () => {
    const range = franchiseScheduleMonthRange(new Date(2028, 1, 29));

    assert.deepEqual(range, {
        from: '2028-02-01',
        to: '2028-03-07'
    });
});
