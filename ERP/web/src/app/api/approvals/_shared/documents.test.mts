import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    actorAppearsInTargets,
    actorAlreadyResponded,
    approvalLineProfileIds,
    hasProtectedDocumentSourceFields,
    isApprovalRetentionExpired,
    parseDocumentDraft
} from './documents.js';

void test('Given an approval retention date When the final UTC day has passed Then downloads are expired', () => {
    assert.equal(isApprovalRetentionExpired('2026-07-12', new Date('2026-07-13T00:00:00.000Z')), true);
    assert.equal(isApprovalRetentionExpired('2026-07-13', new Date('2026-07-13T12:00:00.000Z')), false);
    assert.equal(isApprovalRetentionExpired(null, new Date('2030-01-01T00:00:00.000Z')), false);
});

void test('Given a captured delegate without a current delegation When checking a target Then access is denied', () => {
    const targets = [{ profile_id: 'manager', delegate_profile_ids: ['delegate'] }];

    assert.equal(actorAppearsInTargets(targets, 'delegate', 'approval', []), false);
});

void test('Given a captured delegate with a current scoped delegation When checking a target Then access is allowed', () => {
    const targets = [{ profile_id: 'manager', delegate_profile_ids: ['delegate'] }];
    const grants = [{ delegatorProfileId: 'manager', actionScope: ['approval'] }];

    assert.equal(actorAppearsInTargets(targets, 'delegate', 'approval', grants), true);
    assert.equal(actorAppearsInTargets(targets, 'delegate', 'agreement', grants), false);
});

void test('Given a delegated approval target When the target already responded Then the current delegate is no longer actionable', () => {
    const targets = [{ profile_id: 'manager', delegate_profile_ids: ['delegate'] }];
    const responses = [{ target_profile_id: 'manager', actor_profile_id: 'delegate', action: 'approve' }];
    const grants = [{ delegatorProfileId: 'manager', actionScope: ['approval'] }];

    assert.equal(actorAlreadyResponded(targets, responses, 'delegate', 'approval', grants), true);
    assert.equal(actorAlreadyResponded(targets, responses, 'delegate', 'approval', []), false);
    assert.equal(actorAlreadyResponded(targets, responses, 'other', 'approval', grants), false);
});

void test('Given a document patch When source identifiers are present Then the internal linkage override is rejected', () => {
    assert.equal(hasProtectedDocumentSourceFields({ sourceType: 'supervision' }), true);
    assert.equal(hasProtectedDocumentSourceFields({ sourceId: 'source-1' }), true);
    assert.equal(hasProtectedDocumentSourceFields({ title: '수정 제목' }), false);
});

void test('Given document-specific approvers When parsing a draft Then selections are normalized and discoverable for validation', () => {
    const profileId = '11111111-1111-4111-8111-111111111111';
    const draft = parseDocumentDraft({
        title: '업무 보고',
        body: { approvalLineSelections: { 'step-1': [profileId, profileId] } }
    });

    assert.deepEqual(draft.data.approvalLineSelections, { 'step-1': [profileId] });
    assert.deepEqual(approvalLineProfileIds(draft.data), [profileId]);
});
