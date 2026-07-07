import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildAlimtalkVariablesForCandidate,
    buildDisclosureConfirmedAlimtalkVariables,
    buildDisclosureEmailSentAlimtalkVariables
} from './alimtalk-event-notifications.js';
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

test('buildAutomaticFranchiseNotifications keeps disclosure due source id stable during D-3 through D-1 window', () => {
    const disclosureSummary = buildLeadDisclosureSummary([
        { id: 'delivery-1', sentAt: '2026-06-03T00:00:00.000Z', sendStatus: 'sent' }
    ], new Date('2026-06-14T00:00:00.000Z'));

    const d3Notification = buildAutomaticFranchiseNotifications([
        { ...baseLead, disclosureSummary }
    ], new Date('2026-06-14T00:00:00.000Z')).find(item => item.sourceType === 'disclosure-due');
    const d2Notification = buildAutomaticFranchiseNotifications([
        { ...baseLead, disclosureSummary: { ...disclosureSummary, remainingDays: 2 } }
    ], new Date('2026-06-15T00:00:00.000Z')).find(item => item.sourceType === 'disclosure-due');

    assert.equal(d3Notification?.sourceId, 'lead-1:disclosure-due:delivery-1');
    assert.equal(d2Notification?.sourceId, 'lead-1:disclosure-due:delivery-1');
    assert.equal(d2Notification?.title, '정보공개서 D-2');
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

test('buildAutomaticFranchiseNotifications creates unconfirmed disclosure queue for sent or opened receipts', () => {
    const sentSummary = buildLeadDisclosureSummary([
        { id: 'delivery-sent', sentAt: '2026-07-01T00:00:00.000Z', sendStatus: 'sent' }
    ], new Date('2026-07-03T00:00:00.000Z'));
    const openedSummary = buildLeadDisclosureSummary([
        { id: 'delivery-opened', openedAt: '2026-07-02T00:00:00.000Z', sentAt: '2026-07-01T00:00:00.000Z', sendStatus: 'sent' }
    ], new Date('2026-07-03T00:00:00.000Z'));

    const notifications = buildAutomaticFranchiseNotifications([
        { ...baseLead, disclosureSummary: sentSummary },
        { ...baseLead, id: 'lead-2', name: '이열람', disclosureSummary: openedSummary }
    ], new Date('2026-07-03T00:00:00.000Z'));

    const queueItems = notifications.filter(item => item.sourceType === 'disclosure-unconfirmed');

    assert.equal(queueItems.length, 2);
    assert.equal(queueItems[0]?.title, '정보공개서 수령 미확인');
    assert.equal(queueItems[0]?.data.deliveryId, 'delivery-sent');
    assert.equal(queueItems[1]?.data.openedAt, '2026-07-02T00:00:00.000Z');
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
        { companyId: 'company-1', profileId: 'manager-1' },
        { companyId: 'company-1', contractId: 'vendor-contract-1', profileId: 'owner-1' },
        { companyId: 'company-1', contractId: 'vendor-contract-2', profileId: 'owner-2' }
    ], new Date('2026-07-01T09:00:00+09:00'));

    assert.equal(notifications.some(item => item.title === '업체 계약 D-30'), true);
    assert.equal(notifications.some(item => item.title === '업체 계약 D-7' && item.severity === 'danger'), true);
    assert.equal(notifications.some(item => item.sourceId === 'vendor-contract-2:vendor-contract-due'), true);
    assert.equal(notifications.some(item => item.recipientProfileId === 'owner-2' && item.actionUrl.includes('vendor-contract-2')), true);
    assert.equal(notifications.some(item => item.recipientProfileId === 'owner-1' && item.actionUrl.includes('vendor-contract-2')), false);
    assert.equal(notifications.some(item => item.actionUrl === '/contracts/vendor?contractId=vendor-contract-2'), true);
});

test('buildVendorContractNotifications keeps active contracts in the D-30 window until expiry', () => {
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

    assert.equal(notifications.length, 1);
    assert.equal(notifications[0]?.title, '업체 계약 D-29');
    assert.equal(notifications[0]?.sourceId, 'vendor-contract-2:vendor-contract-due');
});

test('buildVendorContractNotifications skips stale owner recipients outside contract company', () => {
    const notifications = buildVendorContractNotifications([
        {
            companyId: 'company-1',
            contractEndDate: '2026-07-08',
            contractTitle: '식자재 공급 계약',
            id: 'vendor-contract-1',
            ownerProfileId: 'stale-owner',
            status: 'active',
            vendorName: '내일식자재'
        }
    ], [
        { companyId: 'company-1', profileId: 'manager-1' },
        { companyId: 'company-2', contractId: 'vendor-contract-1', profileId: 'stale-owner' }
    ], new Date('2026-07-01T09:00:00+09:00'));

    assert.equal(notifications.some(item => item.recipientProfileId === 'stale-owner'), false);
    assert.equal(notifications.some(item => item.recipientProfileId === 'manager-1'), true);
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

test('buildAlimtalkVariablesForCandidate maps disclosure eligible template aliases', () => {
    const [notification] = buildAutomaticFranchiseNotifications([
        {
            companyId: 'company-1',
            disclosureSummary: {
                confirmedAt: '2026-07-03T01:20:00.000Z',
                contractEligibleAt: '2026-07-17T01:20:00.000Z',
                label: '계약 가능',
                latestDeliveryId: 'delivery-1',
                latestDocumentTitle: '정보공개서',
                latestDocumentVersion: '2026',
                latestSendStatus: 'sent',
                latestSentAt: '2026-07-03T01:00:00.000Z',
                openedAt: null,
                recipientEmail: 'lead@example.com',
                remainingDays: 0,
                state: 'eligible',
                waitDays: 14
            },
            id: 'lead-1',
            managerId: 'manager-1',
            name: '김후보',
            status: '상담중',
            grade: 'HOT'
        }
    ], new Date('2026-07-18T00:00:00.000Z'));

    assert.ok(notification);
    assert.deepEqual(buildAlimtalkVariablesForCandidate(notification, '테스트치킨'), {
        가능일: '2026. 07. 17.',
        계약가능예정일: '2026. 07. 17.',
        계약가능일: '2026. 07. 17.',
        브랜드명: '테스트치킨',
        수령일: '2026. 07. 03.',
        수령확인일: '2026. 07. 03.',
        예비창업자명: '김후보',
        확인일: '2026. 07. 03.',
        후보자명: '김후보'
    });
});

test('buildDisclosureEmailSentAlimtalkVariables maps disclosure email sent template variables', () => {
    assert.deepEqual(buildDisclosureEmailSentAlimtalkVariables({
        brandName: '테스트치킨',
        candidateName: '김후보'
    }), {
        브랜드명: '테스트치킨',
        후보자명: '김후보'
    });
});

test('buildDisclosureConfirmedAlimtalkVariables maps disclosure confirmed template variables', () => {
    assert.deepEqual(buildDisclosureConfirmedAlimtalkVariables({
        brandName: '테스트치킨',
        candidateName: '김후보',
        confirmedAt: '2026-07-03T00:00:00.000Z'
    }), {
        브랜드명: '테스트치킨',
        계약가능예정일: '2026. 07. 17.',
        계약가능일: '2026. 07. 17.',
        수령확인일: '2026. 07. 03.',
        수령일: '2026. 07. 03.',
        확인일: '2026. 07. 03.',
        예비창업자명: '김후보',
        후보자명: '김후보'
    });
});
