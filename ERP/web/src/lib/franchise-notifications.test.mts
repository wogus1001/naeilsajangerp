import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAlimtalkVariablesForCandidate } from './alimtalk-event-notifications.js';
import { buildLeadDisclosureSummary } from './franchise-lead-disclosure-summary.js';
import { buildAutomaticFranchiseNotifications } from './franchise-notifications.js';
import { buildVendorContractNotifications } from './franchise-vendor-contract-notifications.js';

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

test('buildAutomaticFranchiseNotifications links notification to lead detail tab', () => {
    const notifications = buildAutomaticFranchiseNotifications([
        { ...baseLead, nextContactAt: '2026-06-13T09:00:00.000Z', disclosureSummary: buildLeadDisclosureSummary([]) }
    ], new Date('2026-06-14T00:00:00.000Z'));

    const overdueNotification = notifications.find(item => item.sourceType === 'contact-overdue');

    assert.equal(overdueNotification?.actionUrl, '/dashboard/franchise-leads?tab=db&leadId=lead-1');
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

test('buildVendorContractNotifications creates D-30 and D-7 alerts for owner and team lead recipients', () => {
    const notifications = buildVendorContractNotifications([
        {
            companyId: 'company-1',
            contractEndDate: '2026-07-31',
            contractTitle: '물류 계약',
            id: 'vendor-contract-1',
            ownerProfileId: 'owner-1',
            status: 'active',
            vendorName: '내일물류'
        },
        {
            companyId: 'company-1',
            contractEndDate: '2026-07-08',
            contractTitle: '식자재 공급 계약',
            id: 'vendor-contract-2',
            ownerProfileId: 'owner-2',
            status: 'active',
            vendorName: '내일식자재'
        }
    ], [
        { companyId: 'company-1', profileId: 'manager-1' }
    ], new Date('2026-07-01T09:00:00+09:00'));

    assert.equal(notifications.some(item => item.title === '업체 계약 D-30'), true);
    assert.equal(notifications.some(item => item.title === '업체 계약 D-7' && item.severity === 'danger'), true);
    assert.equal(notifications.some(item => item.recipientProfileId === 'owner-2'), true);
    assert.equal(notifications.some(item => item.actionUrl === '/contracts/vendor?contractId=vendor-contract-2'), true);
});

test('buildVendorContractNotifications skips terminal contracts and non-reminder days', () => {
    const notifications = buildVendorContractNotifications([
        {
            companyId: 'company-1',
            contractEndDate: '2026-07-31',
            contractTitle: '종료 계약',
            id: 'vendor-contract-1',
            ownerProfileId: 'owner-1',
            status: 'terminated',
            vendorName: '내일물류'
        },
        {
            companyId: 'company-1',
            contractEndDate: '2026-07-30',
            contractTitle: 'D-29 계약',
            id: 'vendor-contract-2',
            ownerProfileId: 'owner-2',
            status: 'active',
            vendorName: '내일식자재'
        }
    ], [
        { companyId: 'company-1', profileId: 'manager-1' }
    ], new Date('2026-07-01T09:00:00+09:00'));

    assert.equal(notifications.length, 0);
});

test('buildAlimtalkVariablesForCandidate maps vendor contract due template variables', () => {
    const [notification] = buildVendorContractNotifications([
        {
            companyId: 'company-1',
            contractEndDate: '2026-07-08',
            contractTitle: '식자재 공급 계약',
            id: 'vendor-contract-1',
            ownerProfileId: 'owner-1',
            status: 'active',
            vendorName: '내일식자재'
        }
    ], [
        { companyId: 'company-1', profileId: 'manager-1' }
    ], new Date('2026-07-01T09:00:00+09:00'));

    assert.ok(notification);
    assert.deepEqual(buildAlimtalkVariablesForCandidate(notification, '내일사장'), {
        계약명: '식자재 공급 계약',
        만료일: '2026. 07. 08.',
        남은기간: 'D-7',
        남은일수: '7',
        업체명: '내일식자재'
    });
});
