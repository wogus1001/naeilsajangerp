import assert from 'node:assert/strict';
import { test } from 'node:test';
import { delegationProfilesAreEligible } from './delegations.js';

test('Given both delegation participants are eligible When checking the query result Then delegation is allowed', () => {
    assert.equal(delegationProfilesAreEligible(
        ['delegator-1', 'delegate-1'],
        [{ id: 'delegate-1' }, { id: 'delegator-1' }]
    ), true);
});

test('Given an ineligible delegate is excluded by the profile query When checking the result Then delegation is rejected', () => {
    assert.equal(delegationProfilesAreEligible(
        ['delegator-1', 'delegate-1'],
        [{ id: 'delegator-1' }]
    ), false);
});
