import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getFranchiseLeadGradeLabel,
    getFranchiseLeadStageLabel,
    normalizeLeadStage,
    normalizeLeadGrade
} from './franchise-leads.js';

test('normalizeLeadGrade accepts task-oriented Korean priority labels', () => {
    assert.equal(normalizeLeadGrade('즉시상담'), 'HOT');
    assert.equal(normalizeLeadGrade('관심확인'), 'WARM');
    assert.equal(normalizeLeadGrade('장기관리'), 'COLD');
});

test('getFranchiseLeadGradeLabel hides ambiguous English grade codes in UI labels', () => {
    assert.equal(getFranchiseLeadGradeLabel('HOT'), '즉시상담');
    assert.equal(getFranchiseLeadGradeLabel('WARM'), '관심확인');
    assert.equal(getFranchiseLeadGradeLabel('COLD'), '장기관리');
    assert.equal(getFranchiseLeadGradeLabel('VIP'), 'VIP');
});

test('normalizeLeadStage keeps raw intake below candidate pipeline', () => {
    assert.equal(normalizeLeadStage('1차 유입 DB'), 'raw_intake');
    assert.equal(normalizeLeadStage('raw_intake'), 'raw_intake');
    assert.equal(normalizeLeadStage('후보자'), 'candidate');
    assert.equal(getFranchiseLeadStageLabel('raw_intake'), '1차 유입 DB');
});
