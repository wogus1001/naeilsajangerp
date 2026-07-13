import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    actorAlreadyResponded,
    hasProtectedDocumentSourceFields,
    isApprovalRetentionExpired
} from './documents.js';

void test('Given an approval retention date When the final UTC day has passed Then downloads are expired', () => {
    assert.equal(isApprovalRetentionExpired('2026-07-12', new Date('2026-07-13T00:00:00.000Z')), true);
    assert.equal(isApprovalRetentionExpired('2026-07-13', new Date('2026-07-13T12:00:00.000Z')), false);
    assert.equal(isApprovalRetentionExpired(null, new Date('2030-01-01T00:00:00.000Z')), false);
});

void test('Given a delegated approval target When the target already responded Then the delegate is no longer actionable', () => {
    const targets = [{ profile_id: 'manager', delegate_profile_ids: ['delegate'] }];
    const responses = [{ target_profile_id: 'manager', actor_profile_id: 'delegate', action: 'approve' }];

    assert.equal(actorAlreadyResponded(targets, responses, 'delegate'), true);
    assert.equal(actorAlreadyResponded(targets, responses, 'other'), false);
});

void test('Given a document patch When source identifiers are present Then the internal linkage override is rejected', () => {
    assert.equal(hasProtectedDocumentSourceFields({ sourceType: 'supervision' }), true);
    assert.equal(hasProtectedDocumentSourceFields({ sourceId: 'source-1' }), true);
    assert.equal(hasProtectedDocumentSourceFields({ title: '수정 제목' }), false);
});
