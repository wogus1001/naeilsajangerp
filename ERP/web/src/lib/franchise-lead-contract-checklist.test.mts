import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildLeadContractChecklistSummaryMap,
    buildLeadContractChecklistUpsert,
    filterLeadContractChecklistRowsByLeadCompany,
    mergeLeadContractChecklistSteps,
    summarizeLeadContractChecklistForLead,
    summarizeLeadContractChecklist
} from './franchise-lead-contract-checklist.js';

test('mergeLeadContractChecklistSteps returns the seven default pre-contract steps', () => {
    const steps = mergeLeadContractChecklistSteps([]);

    assert.deepEqual(steps.map(step => step.label), [
        '정보공개서 수령 확인',
        '브랜드/본사 사이트 확인',
        '예상 투자금 재확인',
        '희망지역/상권자료 확인',
        '인근 가맹점 현황 확인',
        '계약 가능일 도래 확인',
        '계약서/가맹금 안내'
    ]);
    assert.equal(steps.every(step => step.completed === false), true);
});

test('mergeLeadContractChecklistSteps preserves saved completion and memo state', () => {
    const steps = mergeLeadContractChecklistSteps([
        {
            stepKey: 'disclosure-received',
            label: '저장 라벨',
            completed: true,
            completedAt: '2026-06-12T01:00:00.000Z',
            completedBy: 'manager-1',
            memo: 'PDF 수령 확인'
        }
    ]);

    assert.deepEqual(steps[0], {
        stepKey: 'disclosure-received',
        label: '정보공개서 수령 확인',
        required: true,
        completed: true,
        completedAt: '2026-06-12T01:00:00.000Z',
        completedBy: 'manager-1',
        memo: 'PDF 수령 확인',
        sortOrder: 10,
        updatedAt: ''
    });
});

test('buildLeadContractChecklistUpsert records completion metadata when a step is checked', () => {
    const patch = buildLeadContractChecklistUpsert({
        companyId: 'company-1',
        leadId: 'lead-1',
        requesterId: 'manager-1',
        stepKey: 'site-reviewed',
        completed: true,
        memo: '홈페이지 메뉴 확인',
        nowIso: '2026-06-12T02:00:00.000Z'
    });

    assert.equal(patch.step_key, 'site-reviewed');
    assert.equal(patch.completed, true);
    assert.equal(patch.completed_at, '2026-06-12T02:00:00.000Z');
    assert.equal(patch.completed_by, 'manager-1');
    assert.equal(patch.memo, '홈페이지 메뉴 확인');
});

test('buildLeadContractChecklistUpsert preserves existing completion metadata during memo-only saves', () => {
    const patch = buildLeadContractChecklistUpsert({
        companyId: 'company-1',
        leadId: 'lead-1',
        requesterId: 'manager-2',
        stepKey: 'site-reviewed',
        memo: '추가 메모',
        nowIso: '2026-06-12T03:00:00.000Z',
        existing: {
            completed: true,
            completedAt: '2026-06-12T02:00:00.000Z',
            completedBy: 'manager-1'
        }
    });

    assert.equal(patch.completed, true);
    assert.equal(patch.completed_at, '2026-06-12T02:00:00.000Z');
    assert.equal(patch.completed_by, 'manager-1');
    assert.equal(patch.memo, '추가 메모');
});

test('summarizeLeadContractChecklist counts progress from normalized steps', () => {
    const summary = summarizeLeadContractChecklist([
        { stepKey: 'disclosure-received', completed: true },
        { stepKey: 'site-reviewed', completed: true },
        { stepKey: 'budget-reconfirmed', completed: false }
    ]);

    assert.deepEqual(summary, {
        total: 7,
        completed: 2,
        remaining: 5,
        progressPercent: 29
    });
});

test('summarizeLeadContractChecklistForLead exposes missing required labels', () => {
    const summary = summarizeLeadContractChecklistForLead('lead-1', [
        { stepKey: 'disclosure-received', completed: true },
        { stepKey: 'site-reviewed', completed: true }
    ]);

    assert.equal(summary.leadId, 'lead-1');
    assert.equal(summary.completed, 2);
    assert.equal(summary.remaining, 5);
    assert.deepEqual(summary.remainingLabels.slice(0, 2), [
        '예상 투자금 재확인',
        '희망지역/상권자료 확인'
    ]);
});

test('buildLeadContractChecklistSummaryMap groups rows by lead id', () => {
    const summaryMap = buildLeadContractChecklistSummaryMap(['lead-1', 'lead-2'], [
        { lead_id: 'lead-1', step_key: 'disclosure-received', completed: true },
        { lead_id: 'lead-2', step_key: 'site-reviewed', completed: true },
        { lead_id: 'lead-2', step_key: 'budget-reconfirmed', completed: true }
    ]);

    assert.equal(summaryMap['lead-1']?.completed, 1);
    assert.equal(summaryMap['lead-2']?.completed, 2);
    assert.equal(summaryMap['lead-2']?.remaining, 5);
});

test('filterLeadContractChecklistRowsByLeadCompany removes mismatched company rows', () => {
    const rows = filterLeadContractChecklistRowsByLeadCompany([
        { company_id: 'company-1', lead_id: 'lead-1', step_key: 'disclosure-received', completed: true },
        { company_id: 'company-2', lead_id: 'lead-1', step_key: 'site-reviewed', completed: true },
        { company_id: 'company-2', lead_id: 'lead-2', step_key: 'budget-reconfirmed', completed: true },
        { lead_id: 'lead-2', step_key: 'region-market-reviewed', completed: true }
    ], [
        { company_id: 'company-1', id: 'lead-1' },
        { company_id: 'company-2', lead_id: 'lead-2' }
    ]);

    assert.deepEqual(rows.map(row => row.step_key), ['disclosure-received', 'budget-reconfirmed']);
});
