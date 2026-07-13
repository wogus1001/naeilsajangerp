import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOrganizationPatch } from './organization.js';

const companyId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const profileId = '33333333-3333-4333-8333-333333333333';
const unitId = '44444444-4444-4444-8444-444444444444';

test('Given an approval administrator assignment When a unit is supplied Then ambiguous scope is rejected', () => {
    assert.throws(() => parseOrganizationPatch({
        roleAssignments: [{ roleKey: 'approval_admin', roleName: '결재 관리자', profileId, unitId }]
    }, companyId, actorId), /회사 전체 범위/);
});
