import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildLeadDisclosureDashboardSummary } from './leadDashboardMetrics.js';
import type { FranchiseLead } from './types.js';

function createLead(id: string, state: FranchiseLead['disclosureSummary']): FranchiseLead {
    return {
        id,
        name: id,
        mobile: '',
        source: '',
        status: '상담중',
        grade: '',
        desiredRegion: '',
        budgetMin: null,
        budgetMax: null,
        interestedBrand: '',
        memo: '',
        nextContactAt: null,
        lastContactedAt: null,
        createdAt: '2026-06-16T00:00:00.000Z',
        updatedAt: '2026-06-16T00:00:00.000Z',
        disclosureSummary: state
    };
}

test('buildLeadDisclosureDashboardSummary counts action and d-day states', () => {
    const summary = buildLeadDisclosureDashboardSummary([
        createLead('missing', undefined),
        createLead('failed', { state: 'failed', label: '발송 실패', latestDeliveryId: 'd1', latestSentAt: null, latestDocumentTitle: '', latestDocumentVersion: '', latestSendStatus: 'failed', recipientEmail: '', openedAt: null, confirmedAt: null, contractEligibleAt: null, remainingDays: null, waitDays: 14 }),
        createLead('d1', { state: 'sent', label: 'D-1', latestDeliveryId: 'd2', latestSentAt: '2026-06-01T00:00:00.000Z', latestDocumentTitle: '', latestDocumentVersion: '', latestSendStatus: 'sent', recipientEmail: '', openedAt: null, confirmedAt: null, contractEligibleAt: '2026-06-17T00:00:00.000Z', remainingDays: 1, waitDays: 14 }),
        createLead('eligible', { state: 'eligible', label: '계약 가능', latestDeliveryId: 'd3', latestSentAt: '2026-06-01T00:00:00.000Z', latestDocumentTitle: '', latestDocumentVersion: '', latestSendStatus: 'sent', recipientEmail: '', openedAt: null, confirmedAt: null, contractEligibleAt: '2026-06-15T00:00:00.000Z', remainingDays: 0, waitDays: 14 })
    ]);

    assert.equal(summary.needsAction, 2);
    assert.equal(summary.d1, 1);
    assert.equal(summary.eligible, 1);
    assert.equal(summary.sentTotal, 2);
});
