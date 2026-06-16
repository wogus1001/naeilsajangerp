import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildLeadDisclosureSummary } from './franchise-lead-disclosure-summary.js';
import { buildAutomaticFranchiseNotifications } from './franchise-notifications.js';

const baseLead = {
    id: 'lead-1',
    companyId: 'company-1',
    managerId: 'profile-1',
    name: '김희망',
    status: '상담중',
    grade: 'WARM'
} as const;

test('buildAutomaticFranchiseNotifications creates disclosure D-3 reminder', () => {
    const disclosureSummary = buildLeadDisclosureSummary([
        { id: 'delivery-1', sentAt: '2026-06-03T00:00:00.000Z', sendStatus: 'sent' }
    ], new Date('2026-06-14T00:00:00.000Z'));

    const notifications = buildAutomaticFranchiseNotifications([
        { ...baseLead, disclosureSummary }
    ], new Date('2026-06-14T00:00:00.000Z'));

    assert.equal(notifications.some(item => item.sourceType === 'disclosure-due' && item.title === '정보공개서 D-3'), true);
});

test('buildAutomaticFranchiseNotifications creates contact and missing disclosure alerts', () => {
    const notifications = buildAutomaticFranchiseNotifications([
        { ...baseLead, nextContactAt: '2026-06-13T09:00:00.000Z', disclosureSummary: buildLeadDisclosureSummary([]) }
    ], new Date('2026-06-14T00:00:00.000Z'));

    assert.deepEqual(
        notifications.map(item => item.sourceType).sort(),
        ['contact-overdue', 'disclosure-missing']
    );
});
