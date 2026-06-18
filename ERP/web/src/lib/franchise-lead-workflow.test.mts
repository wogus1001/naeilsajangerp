import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildLeadNextContactAt,
    buildLeadWorkflowDraft,
    getLeadWorkQueueLabel,
    getLeadWorkQueueRank,
    getLeadWorkQueueSummary,
    isLeadNextAction,
    matchesLeadWorkQueue,
    suggestLeadNextContactAt
} from './franchise-lead-workflow.js';
import type { LeadWorkflowInput } from './franchise-lead-workflow.js';

const now = new Date('2026-06-10T12:00:00+09:00');

test('getLeadWorkQueueLabel returns overdue first when next contact is in the past', () => {
    const lead: LeadWorkflowInput = {
        status: '상담중',
        nextContactAt: '2026-06-09T10:00:00+09:00',
        grade: 'HOT'
    };

    const label = getLeadWorkQueueLabel(lead, now);
    const rank = getLeadWorkQueueRank(lead, now);

    assert.equal(label, '연락 지연');
    assert.equal(rank, 0);
});

test('matchesLeadWorkQueue includes explicit no response leads in the no response queue', () => {
    const lead: LeadWorkflowInput = {
        status: '상담중',
        consultationResult: '부재/무응답',
        nextContactAt: null
    };

    const noResponse = matchesLeadWorkQueue(lead, 'no_response', now);
    const all = matchesLeadWorkQueue(lead, 'all', now);

    assert.equal(noResponse, true);
    assert.equal(all, true);
});

test('matchesLeadWorkQueue keeps same-day contact in today queue after the scheduled time passes', () => {
    const lead: LeadWorkflowInput = {
        status: '상담중',
        nextContactAt: '2026-06-10T09:00:00+09:00'
    };

    const today = matchesLeadWorkQueue(lead, 'today', now);
    const overdue = matchesLeadWorkQueue(lead, 'overdue', now);
    const label = getLeadWorkQueueLabel(lead, now);

    assert.equal(today, true);
    assert.equal(overdue, false);
    assert.equal(label, '오늘 연락');
});

test('matchesLeadWorkQueue does not treat an untouched overdue lead as no response', () => {
    const lead: LeadWorkflowInput = {
        status: '상담중',
        nextContactAt: '2026-06-09T10:00:00+09:00',
        lastContactedAt: null,
        consultationResult: '미상담'
    };

    const noResponse = matchesLeadWorkQueue(lead, 'no_response', now);
    const overdue = matchesLeadWorkQueue(lead, 'overdue', now);

    assert.equal(noResponse, false);
    assert.equal(overdue, true);
});

test('matchesLeadWorkQueue excludes contract-ready leads from work queues', () => {
    const lead: LeadWorkflowInput = {
        status: '상담중',
        nextContactAt: null,
        nextAction: '계약 조건 확인',
        consultationResult: '조건 조율'
    };

    const all = matchesLeadWorkQueue(lead, 'all', now);
    const label = getLeadWorkQueueLabel(lead, now);

    assert.equal(all, false);
    assert.equal(label, '후속 관리');
});

test('getLeadWorkQueueSummary counts each actionable queue without losing overlap', () => {
    const leads: readonly LeadWorkflowInput[] = [
        { status: '상담중', nextContactAt: '2026-06-09T10:00:00+09:00' },
        { status: '상담중', nextContactAt: '2026-06-10T18:00:00+09:00' },
        { status: '계약예정', nextAction: '계약 조건 확인' },
        { status: '문의접수', grade: 'HOT' },
        { status: '상담중', consultationResult: '부재/무응답' }
    ];

    const summary = getLeadWorkQueueSummary(leads, now);

    assert.deepEqual(summary, {
        all: 5,
        actionable: 3,
        overdue: 1,
        today: 1,
        noResponse: 1
    });
});

test('buildLeadWorkflowDraft fills missing workflow fields with explicit defaults', () => {
    const draft = buildLeadWorkflowDraft({
        status: '문의접수',
        churnReason: '예산 부족',
        budgetFit: '부적합'
    });

    assert.deepEqual(draft, {
        nextAction: '미정',
        consultationResult: '미상담',
        churnReason: '예산 부족',
        budgetFit: '부적합',
        regionFit: '미확인',
        brandFit: '미확인'
    });
});

test('suggestLeadNextContactAt recommends tomorrow morning when a lead did not answer', () => {
    const suggestedAt = suggestLeadNextContactAt({
        nextAction: '미정',
        consultationResult: '부재/무응답'
    }, now);

    assert.equal(suggestedAt, '2026-06-11T01:00:00.000Z');
});

test('suggestLeadNextContactAt recommends a three day follow-up for contract condition checks', () => {
    const suggestedAt = suggestLeadNextContactAt({
        nextAction: '계약 조건 확인',
        consultationResult: '조건 조율'
    }, now);

    assert.equal(suggestedAt, '2026-06-13T01:00:00.000Z');
});

test('suggestLeadNextContactAt recommends a next-day follow-up when a matching request needs a property proposal', () => {
    const suggestedAt = suggestLeadNextContactAt({
        nextAction: '물건 제안',
        consultationResult: '미상담'
    }, now);

    assert.equal(suggestedAt, '2026-06-11T01:00:00.000Z');
});

test('isLeadNextAction accepts active actions carried from matching requests', () => {
    const actions = ['브랜드 제안', '물건 제안', '예산 재확인', '대출 상담 연결', '보류'];

    assert.deepEqual(actions.map(isLeadNextAction), [true, true, true, true, true]);
});

test('suggestLeadNextContactAt skips follow-up recommendations for churned leads', () => {
    const suggestedAt = suggestLeadNextContactAt({
        nextAction: '추가 상담',
        consultationResult: '이탈'
    }, now);

    assert.equal(suggestedAt, null);
});

test('buildLeadNextContactAt builds a quick one week follow-up preset', () => {
    const scheduledAt = buildLeadNextContactAt('week_later', now);

    assert.equal(scheduledAt, '2026-06-17T01:00:00.000Z');
});
