import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from './api-auth.js';
import { canReadSchedule } from './schedule-access.js';

const companyId = '11111111-1111-4111-8111-111111111111';
const requesterId = '22222222-2222-4222-8222-222222222222';
const requester: RequesterProfile = { company_id: companyId, id: requesterId, role: 'staff' };

test('Given an approval schedule When the requester is not a target Then confidential metadata stays hidden', () => {
    assert.equal(canReadSchedule(requester, {
        companyId,
        metadata: { targetProfileIds: ['33333333-3333-4333-8333-333333333333'] },
        scope: 'company',
        sourceType: 'approval-document'
    }), false);
});

test('Given an approval schedule When the requester is an explicit target Then the schedule is visible', () => {
    assert.equal(canReadSchedule(requester, {
        companyId,
        metadata: { targetProfileIds: [requesterId] },
        scope: 'company',
        sourceType: 'approval-document'
    }), true);
});

test('Given a regular company schedule When the requester belongs to the company Then it remains visible', () => {
    assert.equal(canReadSchedule(requester, { companyId, scope: 'company', sourceType: 'manual-workflow' }), true);
});
