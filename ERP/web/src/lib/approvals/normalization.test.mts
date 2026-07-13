import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    normalizeTemplateFields,
    normalizeTemplateSteps
} from './normalization.js';
import {
    organizationUnitId,
    profileId,
    type OrganizationSnapshot
} from './types.js';
import { resolveStepTargets } from './targets.js';

void test('Given malformed and duplicate fields When normalizing Then stable structured fields remain', () => {
    const fields = normalizeTemplateFields([
        { key: ' Expense Amount ', label: ' 지출 금액 ', type: 'currency', required: true },
        { key: 'expense_amount', label: '중복', type: 'text' },
        { key: 'method', label: ' 결제 수단 ', type: 'select', options: [' 카드 ', '현금', '카드', ''], columns: 2, description: '선택', editableBy: 'approver' },
        { key: '', label: '키 없음', type: 'text' },
        null
    ]);

    assert.deepEqual(fields, [
        {
            key: 'expense_amount',
            label: '지출 금액',
            type: 'money',
            required: true,
            placeholder: '',
            options: []
        },
        {
            key: 'method',
            label: '결제 수단',
            type: 'select',
            required: false,
            placeholder: '',
            options: ['카드', '현금'],
            columns: 2,
            description: '선택',
            editableBy: 'approver'
        }
    ]);
});

void test('Given unordered template steps When normalizing Then actions, modes, and order are canonical', () => {
    const steps = normalizeTemplateSteps([
        {
            key: 'final', order: 20, label: ' 최종 결재 ', action: 'approve', mode: 'all',
            target: { kind: 'role', roleKey: ' executive ', unitId: null }
        },
        {
            key: 'review', order: 10, label: ' 합의 ', action: 'agree', mode: 'any',
            target: { kind: 'unit_manager', unitId: 'unit-1' }
        }
    ]);

    assert.equal(steps[0]?.key, 'review');
    assert.equal(steps[0]?.action, 'agreement');
    assert.equal(steps[0]?.mode, 'parallel_any');
    assert.deepEqual(steps[0]?.target, { kind: 'unit_manager', unitId: organizationUnitId('unit-1') });
    assert.equal(steps[1]?.mode, 'parallel_all');
});

void test('Given an organization snapshot When resolving role and manager targets Then immutable target snapshots are returned', () => {
    const units = [{
        id: organizationUnitId('unit-1'),
        parentId: null,
        name: '영업팀',
        managerProfileId: profileId('manager-1'),
        active: true
    }];
    const memberships = [{
        profileId: profileId('manager-1'),
        profileName: '김 팀장',
        unitId: organizationUnitId('unit-1'),
        jobTitle: '팀장',
        primary: true,
        active: true
    }];
    const snapshot: OrganizationSnapshot = {
        capturedAt: '2026-07-13T00:00:00.000Z',
        units,
        memberships,
        roleAssignments: [{
            roleKey: 'executive',
            profileId: profileId('manager-1'),
            unitId: null,
            activeFrom: null,
            activeUntil: null
        }],
        delegations: []
    };
    const steps = normalizeTemplateSteps([{
        key: 'review', order: 1, label: '결재', action: 'approval', mode: 'all',
        target: { kind: 'role', roleKey: 'executive', unitId: null }
    }]);

    const resolved = resolveStepTargets(steps, snapshot, {
        authorProfileId: profileId('author-1'),
        effectiveAt: '2026-07-13T00:00:00.000Z'
    });
    const originalUnit = units[0];
    const originalMembership = memberships[0];
    if (!originalUnit || !originalMembership) assert.fail('organization fixture is incomplete');
    units[0] = { ...originalUnit, name: '변경된 팀' };
    memberships[0] = { ...originalMembership, profileName: '변경된 이름' };

    assert.deepEqual(resolved[0]?.targets[0], {
        profileId: profileId('manager-1'),
        profileName: '김 팀장',
        unitId: organizationUnitId('unit-1'),
        unitName: '영업팀',
        roleKey: 'executive',
        delegateProfileIds: []
    });
});
