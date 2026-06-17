import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    FRANCHISE_LEAD_SOURCES,
    FRANCHISE_LEAD_REGISTRATION_SOURCE,
    FRANCHISE_MATCHING_REQUEST_SOURCE,
    getFranchiseLeadGradeLabel,
    getFranchiseLeadStageLabel,
    normalizeLeadStage,
    normalizeLeadGrade
} from './franchise-leads.js';

test('normalizeLeadGrade accepts task-oriented Korean priority labels', () => {
    assert.equal(normalizeLeadGrade('즉시상담'), 'HOT');
    assert.equal(normalizeLeadGrade('핵심'), 'HOT');
    assert.equal(normalizeLeadGrade('중요'), 'HOT');
    assert.equal(normalizeLeadGrade('관심확인'), 'WARM');
    assert.equal(normalizeLeadGrade('장기관리'), 'COLD');
});

test('getFranchiseLeadGradeLabel hides ambiguous English grade codes in UI labels', () => {
    assert.equal(getFranchiseLeadGradeLabel('HOT'), '중요');
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

test('franchise matching request is a first-class lead source', () => {
    assert.equal(FRANCHISE_MATCHING_REQUEST_SOURCE, '프랜차이즈 매칭 요청');
    assert.ok(FRANCHISE_LEAD_SOURCES.includes(FRANCHISE_MATCHING_REQUEST_SOURCE));
});

test('franchise lead registration is a first-class lead source', () => {
    assert.equal(FRANCHISE_LEAD_REGISTRATION_SOURCE, '가맹 희망자 등록');
    assert.ok(FRANCHISE_LEAD_SOURCES.includes(FRANCHISE_LEAD_REGISTRATION_SOURCE));
});
