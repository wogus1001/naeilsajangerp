import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildLeadWorkflowDraft,
    getLeadWorkQueueLabel,
    getLeadWorkQueueRank,
    getLeadWorkQueueSummary,
    matchesLeadWorkQueue
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
        actionable: 5,
        overdue: 1,
        today: 1,
        noResponse: 2,
        contract: 1,
        hot: 1
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
