import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from '@/lib/api-auth';
import { canManageApprovals, canViewApprovalDocument } from './policy.js';

const companyId = '11111111-1111-4111-8111-111111111111';
const requesterId = '22222222-2222-4222-8222-222222222222';
const authorId = '33333333-3333-4333-8333-333333333333';

function requester(role: string, id = requesterId): RequesterProfile {
    return { company_id: companyId, id, role };
}

test('Given a company approval-admin assignment When checking management Then staff gains approval administration only there', () => {
    assert.equal(canManageApprovals(requester('staff'), true), true);
    assert.equal(canManageApprovals(requester('staff'), false), false);
    assert.equal(canManageApprovals(requester('manager'), false), true);
    assert.equal(canManageApprovals(requester('admin'), false), true);
});

test('Given an unrelated company member When checking a document Then company membership alone grants no visibility', () => {
    assert.equal(canViewApprovalDocument({
        authorProfileId: authorId,
        globalAdmin: false,
        organizationReceiver: false,
        pastOrActiveAssignee: false,
        reader: false,
        requesterId,
        approvalAdmin: false
    }), false);
});

test('Given each allowed document relationship When checking visibility Then access is granted', () => {
    const base = {
        authorProfileId: authorId,
        globalAdmin: false,
        organizationReceiver: false,
        pastOrActiveAssignee: false,
        reader: false,
        requesterId,
        approvalAdmin: false
    };

    assert.equal(canViewApprovalDocument({ ...base, requesterId: authorId }), true);
    assert.equal(canViewApprovalDocument({ ...base, pastOrActiveAssignee: true }), true);
    assert.equal(canViewApprovalDocument({ ...base, reader: true }), true);
    assert.equal(canViewApprovalDocument({ ...base, organizationReceiver: true }), true);
    assert.equal(canViewApprovalDocument({ ...base, approvalAdmin: true }), true);
    assert.equal(canViewApprovalDocument({ ...base, globalAdmin: true }), true);
});
