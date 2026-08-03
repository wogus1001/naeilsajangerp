import assert from 'node:assert/strict';
import test from 'node:test';
import {
    resolveUpdatedLeadStage,
    RETURN_TO_RAW_INTAKE_TRANSITION
} from './franchise-lead-stage-transition';

test('Given 후보자 일반 수정 When raw_intake 단계가 섞여 들어오면 Then 후보자 단계를 보존한다', () => {
    // Given
    const transition = undefined;

    // When
    const nextStage = resolveUpdatedLeadStage('candidate', 'raw_intake', transition);

    // Then
    assert.equal(nextStage, 'candidate');
});

test('Given 후보자 명시적 이동 When 1차 유입 DB 복귀를 요청하면 Then raw_intake 단계로 변경한다', () => {
    // Given
    const transition = RETURN_TO_RAW_INTAKE_TRANSITION;

    // When
    const nextStage = resolveUpdatedLeadStage('candidate', 'raw_intake', transition);

    // Then
    assert.equal(nextStage, 'raw_intake');
});

test('Given 단계 변경 없는 수정 When 저장하면 Then 단계 값을 만들지 않는다', () => {
    // Given
    const transition = undefined;

    // When
    const nextStage = resolveUpdatedLeadStage('candidate', null, transition);

    // Then
    assert.equal(nextStage, null);
});
