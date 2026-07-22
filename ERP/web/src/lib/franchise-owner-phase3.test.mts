import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildOwnerPhase3SourceKey,
    buildOwnerPhase3StoragePath,
    canTransitionOwnerSettlementStatus,
    isOwnerPhase3StoragePath
} from './franchise-owner-phase3';

const companyId = '0370fba6-364a-43a9-9cc4-0f133a9d2052';
const locationId = '92924bd6-b2a1-49bb-844b-05eabcc51bbf';
const sourceId = '19a7f698-5b5f-4aa7-bc66-23236019023d';
const uniqueId = '68c1f2d5-4e30-4e89-97f1-f683d7591fb0';

test('phase 3 source keys stay company scoped and deterministic', () => {
    assert.equal(buildOwnerPhase3SourceKey({
        companyId,
        locationId,
        ownerAccountId: null,
        sourceType: 'content_item',
        sourceId
    }), `${companyId}:content_item:${sourceId}`);
});

test('private owner files include source, company, location and source id boundaries', () => {
    const path = buildOwnerPhase3StoragePath({
        companyId,
        fileName: '7월 정산 증빙.pdf',
        locationId,
        sourceId,
        sourceType: 'settlement',
        uniqueId
    });
    assert.equal(path, `settlement/${companyId}/${locationId}/${sourceId}/${uniqueId}-7.pdf`);
    assert.equal(isOwnerPhase3StoragePath({ companyId, locationId, path: path || '', sourceType: 'settlement' }), true);
    assert.equal(isOwnerPhase3StoragePath({ companyId: sourceId, locationId, path: path || '' }), false);
});

test('settlement review transitions reject terminal-state rewrites', () => {
    assert.equal(canTransitionOwnerSettlementStatus('draft', 'submitted'), true);
    assert.equal(canTransitionOwnerSettlementStatus('submitted', 'rejected'), true);
    assert.equal(canTransitionOwnerSettlementStatus('rejected', 'submitted'), true);
    assert.equal(canTransitionOwnerSettlementStatus('confirmed', 'rejected'), false);
    assert.equal(canTransitionOwnerSettlementStatus('draft', 'confirmed'), false);
});
