import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ApprovalTemplateStep } from './approvalTypes.js';
import {
    approvalLineSelectionCount,
    moveApprovalLineSelection,
    selectedApprovalSteps,
    updateApprovalLineSelection
} from './approvalLineSelections.js';

function step(mode: ApprovalTemplateStep['mode']): ApprovalTemplateStep {
    return {
        id: 'step-1',
        label: '결재',
        action: 'approval',
        mode,
        target: { kind: 'author_manager' },
        targetLabel: '작성자 소속 부서장'
    };
}

test('Given a sequential step When selecting approvers Then all selections are retained in order', () => {
    const first = updateApprovalLineSelection({}, step('sequential'), 'profile-a', true);
    const second = updateApprovalLineSelection(first, step('sequential'), 'profile-b', true);
    assert.deepEqual(second['step-1'], ['profile-a', 'profile-b']);
    assert.equal(approvalLineSelectionCount(second), 2);
});

test('Given a parallel step When selecting approvers Then all unique selections are retained', () => {
    const first = updateApprovalLineSelection({}, step('parallel_all'), 'profile-a', true);
    const second = updateApprovalLineSelection(first, step('parallel_all'), 'profile-b', true);
    assert.deepEqual(second['step-1'], ['profile-a', 'profile-b']);
    assert.equal(approvalLineSelectionCount(second), 2);
});

test('Given selected sequential approvers When moving one up Then the approval order changes', () => {
    const selections = { 'step-1': ['profile-a', 'profile-b', 'profile-c'] };
    const moved = moveApprovalLineSelection(selections, 'step-1', 'profile-c', -1);

    assert.deepEqual(moved['step-1'], ['profile-a', 'profile-c', 'profile-b']);
});

test('Given selected sequential approvers When building preview Then each person becomes one visible step', () => {
    const selected = selectedApprovalSteps(
        [step('sequential')],
        { 'step-1': ['profile-a', 'profile-b'] },
        {
            canManageOrganization: false,
            requesterProfileId: 'author',
            people: [
                { id: 'profile-a', name: '김팀장', email: 'a@example.com', role: 'manager' },
                { id: 'profile-b', name: '박대표', email: 'b@example.com', role: 'admin' }
            ],
            units: [], memberships: [], roleAssignments: [], delegations: []
        }
    );

    assert.equal(selected.length, 2);
    assert.deepEqual(selected.map(item => item.targetLabel), ['김팀장', '박대표']);
});
