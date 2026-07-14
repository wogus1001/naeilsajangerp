import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isCurrentOrganizationMembership } from './download-access.js';

test('Given a membership without a date limit When checking access Then it is current', () => {
    assert.equal(isCurrentOrganizationMembership({ ends_on: null, starts_on: null }, '2026-07-13'), true);
});

test('Given a future or expired membership When checking access Then it is not current', () => {
    assert.equal(isCurrentOrganizationMembership({ ends_on: null, starts_on: '2026-07-14' }, '2026-07-13'), false);
    assert.equal(isCurrentOrganizationMembership({ ends_on: '2026-07-12', starts_on: null }, '2026-07-13'), false);
});

test('Given a membership ending today When checking access Then the final day remains current', () => {
    assert.equal(isCurrentOrganizationMembership({ ends_on: '2026-07-13', starts_on: '2026-07-01' }, '2026-07-13'), true);
});
