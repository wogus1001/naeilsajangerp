import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    applyDocumentAction,
    getActionEligibility,
    summarizeDocumentState
} from './workflow.js';
import {
    profileId,
    type DocumentWorkflowState,
    type ResolvedStep
} from './types.js';

const author = profileId('author');
const manager = profileId('manager');
const director = profileId('director');

function step(
    id: string,
    order: number,
    action: ResolvedStep['action'],
    mode: ResolvedStep['mode'],
    targetIds: readonly ReturnType<typeof profileId>[]
): ResolvedStep {
    return {
        key: id,
        order,
        label: id,
        action,
        mode,
        targets: targetIds.map(targetId => ({
            profileId: targetId,
            profileName: targetId.value,
            unitId: null,
            unitName: '',
            roleKey: '',
            delegateProfileIds: []
        }))
    };
}

function draft(steps: readonly ResolvedStep[]): DocumentWorkflowState {
    return {
        status: 'draft',
        authorProfileId: author,
        currentStepOrder: null,
        submittedAt: null,
        completedAt: null,
        steps: steps.map(item => ({ ...item, status: 'pending', responses: [] }))
    };
}

function transition(
    state: DocumentWorkflowState,
    action: Parameters<typeof applyDocumentAction>[1]
): DocumentWorkflowState {
    const result = applyDocumentAction(state, action);
    if (!result.ok) assert.fail(result.reason);
    return result.state;
}

void test('Given sequential approval steps When each approver acts Then only the next step advances', () => {
    let state = transition(draft([
        step('team', 1, 'approval', 'sequential', [manager]),
        step('executive', 2, 'approval', 'sequential', [director])
    ]), { kind: 'submit', actorProfileId: author, occurredAt: '2026-07-13T01:00:00.000Z' });

    assert.deepEqual(summarizeDocumentState(state), {
        status: 'in_review', currentStepOrder: 1, completedStepCount: 0,
        totalStepCount: 2, respondedTargetCount: 0, totalTargetCount: 2
    });
    state = transition(state, { kind: 'approve', actorProfileId: manager, occurredAt: '2026-07-13T01:01:00.000Z' });
    assert.equal(state.currentStepOrder, 2);
    assert.equal(state.steps[0]?.status, 'approved');
    assert.equal(state.steps[1]?.status, 'active');
    state = transition(state, { kind: 'approve', actorProfileId: director, occurredAt: '2026-07-13T01:02:00.000Z' });
    assert.equal(state.status, 'approved');
    assert.equal(state.currentStepOrder, null);
});

void test('Given parallel all agreement When one of two targets agrees Then the step waits for everyone', () => {
    let state = transition(draft([
        step('agreement', 1, 'agreement', 'parallel_all', [manager, director])
    ]), { kind: 'submit', actorProfileId: author, occurredAt: '2026-07-13T02:00:00.000Z' });

    state = transition(state, { kind: 'agree', actorProfileId: manager, occurredAt: '2026-07-13T02:01:00.000Z' });
    assert.equal(state.status, 'in_review');
    assert.equal(state.steps[0]?.status, 'active');
    state = transition(state, { kind: 'agree', actorProfileId: director, occurredAt: '2026-07-13T02:02:00.000Z' });
    assert.equal(state.status, 'approved');
    assert.equal(state.steps[0]?.status, 'agreed');
});

void test('Given parallel any agreement When one target agrees Then the step completes immediately', () => {
    let state = transition(draft([
        step('agreement', 1, 'agreement', 'parallel_any', [manager, director])
    ]), { kind: 'submit', actorProfileId: author, occurredAt: '2026-07-13T03:00:00.000Z' });

    state = transition(state, { kind: 'agree', actorProfileId: manager, occurredAt: '2026-07-13T03:01:00.000Z' });
    assert.equal(state.status, 'approved');
    assert.equal(state.steps[0]?.responses.length, 1);
});

void test('Given parallel any agreement When one target disagrees Then a later approval cannot override the rejection', () => {
    let state = transition(draft([
        step('agreement', 1, 'agreement', 'parallel_any', [manager, director])
    ]), { kind: 'submit', actorProfileId: author, occurredAt: '2026-07-13T03:10:00.000Z' });

    state = transition(state, { kind: 'disagree', actorProfileId: manager, occurredAt: '2026-07-13T03:11:00.000Z' });

    assert.equal(state.status, 'rejected');
    assert.equal(getActionEligibility(state, 'agree', director).allowed, false);
});

void test('Given the author is also an approval target When checking approval Then self approval is blocked', () => {
    const state = transition(draft([
        step('self', 1, 'approval', 'sequential', [author])
    ]), { kind: 'submit', actorProfileId: author, occurredAt: '2026-07-13T04:00:00.000Z' });

    assert.deepEqual(getActionEligibility(state, 'approve', author), {
        allowed: false,
        reason: '작성자는 본인 문서를 결재할 수 없습니다.'
    });
});

void test('Given an in-review document When withdrawal crosses the first response Then only the untouched document can be withdrawn', () => {
    const submitted = transition(draft([
        step('agreement', 1, 'agreement', 'parallel_all', [manager, director])
    ]), { kind: 'submit', actorProfileId: author, occurredAt: '2026-07-13T05:00:00.000Z' });
    const responded = transition(submitted, {
        kind: 'agree', actorProfileId: manager, occurredAt: '2026-07-13T05:01:00.000Z'
    });

    assert.equal(getActionEligibility(submitted, 'withdraw', author).allowed, true);
    assert.deepEqual(getActionEligibility(responded, 'withdraw', author), {
        allowed: false,
        reason: '결재 또는 합의가 시작된 문서는 회수할 수 없습니다.'
    });
    const withdrawn = transition(submitted, {
        kind: 'withdraw', actorProfileId: author, occurredAt: '2026-07-13T05:02:00.000Z'
    });
    assert.equal(withdrawn.status, 'withdrawn');
});
