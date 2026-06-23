import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildLeadContractChecklistSummaryMap,
    buildLeadContractChecklistUpsert,
    filterLeadContractChecklistRowsByLeadCompany,
    InvalidLeadContractChecklistApplicabilityError,
    mergeLeadContractChecklistSteps,
    summarizeLeadContractChecklist,
    summarizeLeadContractChecklistForLead
} from './franchise-lead-contract-checklist.js';

test('mergeLeadContractChecklistSteps returns the v2 document-based checklist definitions', () => {
    const steps = mergeLeadContractChecklistSteps([]);

    assert.equal(steps.length, 17);
    assert.deepEqual(steps.slice(0, 5).map(step => step.label), [
        '점주 신분증/인감증명서',
        '가맹계약서 및 정보공개서 수령확인서',
        '개인정보 수집·이용·제공 동의서',
        '점포개발/실측의뢰서',
        '건물 임대차계약서'
    ]);
    assert.equal(steps.find(step => step.stepKey === 'privacy-consent')?.basisType, 'privacy');
    assert.equal(steps.find(step => step.stepKey === 'expected-sales-statement')?.applicability, 'not_applicable');
});

test('mergeLeadContractChecklistSteps preserves saved completion, memo, and v2 metadata', () => {
    const steps = mergeLeadContractChecklistSteps([
        {
            stepKey: 'disclosure-contract-receipt',
            label: '저장 라벨',
            completed: true,
            completedAt: '2026-06-12T01:00:00.000Z',
            completedBy: 'manager-1',
            memo: 'PDF 수령 확인',
            requirement_type: 'required',
            basis_type: 'franchise_law',
            owner_team: '점포개발'
        }
    ]);

    assert.deepEqual(steps[1], {
        stepKey: 'disclosure-contract-receipt',
        label: '가맹계약서 및 정보공개서 수령확인서',
        required: true,
        requirementType: 'required',
        basisType: 'franchise_law',
        basisText: '가맹사업법 준수 및 정보공개서 제공 이력 확인',
        ownerTeam: '점포개발',
        applicability: 'applicable',
        requiredEvidence: true,
        allowNotApplicable: false,
        completed: true,
        resolved: true,
        completedAt: '2026-06-12T01:00:00.000Z',
        completedBy: 'manager-1',
        memo: 'PDF 수령 확인',
        sortOrder: 20,
        updatedAt: '',
        documentSummary: {
            count: 0,
            latestTitle: '',
            latestStatus: '',
            requiredEvidenceLinked: false,
            documentIds: []
        }
    });
});

test('summarizeLeadContractChecklist separates required, report, and optional progress', () => {
    const summary = summarizeLeadContractChecklist([
        { stepKey: 'owner-id-seal-certificate', completed: true },
        { stepKey: 'disclosure-contract-receipt', completed: true },
        { stepKey: 'lease-contract-copy', completed: true },
        { stepKey: 'site-survey-request', applicability: 'not_applicable', memo: '실측 없이 진행' }
    ]);

    assert.equal(summary.total, 17);
    assert.equal(summary.groups.required.total, 6);
    assert.equal(summary.groups.required.resolved, 3);
    assert.equal(summary.groups.report.total, 7);
    assert.equal(summary.groups.report.resolved, 1);
    assert.equal(summary.groups.optional.total, 4);
    assert.equal(summary.groups.optional.resolved, 1);
});

test('summarizeLeadContractChecklist counts missing linked documents for required evidence', () => {
    const summary = summarizeLeadContractChecklist([
        { stepKey: 'owner-id-seal-certificate', completed: true },
        { stepKey: 'disclosure-contract-receipt', completed: true }
    ], {
        'owner-id-seal-certificate': {
            count: 1,
            latestTitle: '신분증.pdf',
            latestStatus: 'active',
            requiredEvidenceLinked: true,
            documentIds: ['doc-1']
        }
    });

    assert.equal(summary.missingRequiredCount, 4);
    assert.equal(summary.groups.required.missingDocumentCount, 4);
});

test('buildLeadContractChecklistUpsert records v2 fields and completion metadata', () => {
    const patch = buildLeadContractChecklistUpsert({
        companyId: 'company-1',
        leadId: 'lead-1',
        requesterId: 'manager-1',
        stepKey: 'lease-contract-copy',
        completed: true,
        memo: '계약서 원본 확인',
        nowIso: '2026-06-12T02:00:00.000Z'
    });

    assert.equal(patch.step_key, 'lease-contract-copy');
    assert.equal(patch.requirement_type, 'report');
    assert.equal(patch.basis_type, 'internal');
    assert.equal(patch.owner_team, '점포개발');
    assert.equal(patch.completed, true);
    assert.equal(patch.completed_at, '2026-06-12T02:00:00.000Z');
    assert.equal(patch.completed_by, 'manager-1');
});

test('buildLeadContractChecklistUpsert preserves existing completion metadata during memo-only saves', () => {
    const patch = buildLeadContractChecklistUpsert({
        companyId: 'company-1',
        leadId: 'lead-1',
        requesterId: 'manager-2',
        stepKey: 'lease-contract-copy',
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

test('buildLeadContractChecklistUpsert requires memo for not-applicable handling', () => {
    assert.throws(
        () => buildLeadContractChecklistUpsert({
            companyId: 'company-1',
            leadId: 'lead-1',
            requesterId: 'manager-1',
            stepKey: 'site-survey-request',
            applicability: 'not_applicable'
        }),
        InvalidLeadContractChecklistApplicabilityError
    );
});

test('buildLeadContractChecklistUpsert allows not-applicable for required documents when memo exists', () => {
    const patch = buildLeadContractChecklistUpsert({
        companyId: 'company-1',
        leadId: 'lead-1',
        requesterId: 'manager-1',
        stepKey: 'franchise-contract',
        completed: true,
        applicability: 'not_applicable',
        memo: '본 건 계약서 수기 보관'
    });

    assert.equal(patch.applicability, 'not_applicable');
    assert.equal(patch.completed, false);
    assert.equal(patch.completed_at, null);
    assert.equal(patch.memo, '본 건 계약서 수기 보관');
});

test('summarizeLeadContractChecklistForLead exposes missing required labels only', () => {
    const summary = summarizeLeadContractChecklistForLead('lead-1', [
        { stepKey: 'owner-id-seal-certificate', completed: true },
        { stepKey: 'expected-sales-statement', applicability: 'not_applicable', memo: '대상 가맹본부 아님' }
    ]);

    assert.equal(summary.leadId, 'lead-1');
    assert.equal(summary.groups.required.resolved, 2);
    assert.deepEqual(summary.remainingLabels.slice(0, 2), [
        '가맹계약서 및 정보공개서 수령확인서',
        '개인정보 수집·이용·제공 동의서'
    ]);
});

test('buildLeadContractChecklistSummaryMap groups rows and document summaries by lead id', () => {
    const summaryMap = buildLeadContractChecklistSummaryMap(['lead-1', 'lead-2'], [
        { lead_id: 'lead-1', step_key: 'owner-id-seal-certificate', completed: true },
        { lead_id: 'lead-2', step_key: 'lease-contract-copy', completed: true },
        { lead_id: 'lead-2', step_key: 'site-survey-request', applicability: 'not_applicable', memo: '불필요' }
    ], true, {
        'lead-1': {
            'owner-id-seal-certificate': {
                count: 1,
                latestTitle: '신분증.pdf',
                latestStatus: 'active',
                requiredEvidenceLinked: true,
                documentIds: ['doc-1']
            }
        }
    });

    assert.equal(summaryMap['lead-1']?.groups.required.resolved, 2);
    assert.equal(summaryMap['lead-2']?.groups.report.resolved, 1);
    assert.equal(summaryMap['lead-2']?.groups.optional.resolved, 1);
});

test('filterLeadContractChecklistRowsByLeadCompany removes mismatched company rows', () => {
    const rows = filterLeadContractChecklistRowsByLeadCompany([
        { company_id: 'company-1', lead_id: 'lead-1', step_key: 'owner-id-seal-certificate', completed: true },
        { company_id: 'company-2', lead_id: 'lead-1', step_key: 'lease-contract-copy', completed: true },
        { company_id: 'company-2', lead_id: 'lead-2', step_key: 'site-survey-request', completed: true },
        { lead_id: 'lead-2', step_key: 'privacy-consent', completed: true }
    ], [
        { company_id: 'company-1', id: 'lead-1' },
        { company_id: 'company-2', lead_id: 'lead-2' }
    ]);

    assert.deepEqual(rows.map(row => row.step_key), ['owner-id-seal-certificate', 'site-survey-request']);
});
