import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildDisclosureEligibilitySchedule,
    buildVendorContractRenewalSchedule
} from './franchise-source-schedules.js';

void test('Given an active vendor contract When its end date is past Then a late renewal schedule is built', () => {
    const schedule = buildVendorContractRenewalSchedule({
        companyId: 'company-1',
        contractEndDate: '2026-07-14',
        contractTitle: '물류 계약',
        id: 'contract-1',
        ownerProfileId: 'owner-1',
        status: 'active',
        vendorName: '내일물류'
    }, {
        fallbackAssigneeProfileId: 'requester-1',
        managerProfileId: 'manager-1',
        now: new Date('2026-07-15T03:00:00.000Z')
    });

    assert.equal(schedule?.sourceType, 'vendor-contract-renewal');
    assert.equal(schedule?.sourceId, 'contract-1');
    assert.equal(schedule?.status, '지연');
    assert.equal(schedule?.assigneeProfileId, 'owner-1');
    assert.equal(schedule?.date, '2026-07-14');
    assert.equal(schedule?.metadata?.actionUrl, '/dashboard/franchise-vendors');
});

void test('Given terminal vendor contracts When building schedules Then renewed is complete and archived is cancelled', () => {
    const baseContract = {
        companyId: 'company-1',
        contractEndDate: '2026-07-30',
        contractTitle: '식자재 계약',
        id: 'contract-1',
        ownerProfileId: '',
        vendorName: '내일푸드'
    } as const;
    const context = {
        fallbackAssigneeProfileId: 'requester-1',
        managerProfileId: null,
        now: new Date('2026-07-15T03:00:00.000Z')
    } as const;

    assert.equal(buildVendorContractRenewalSchedule({ ...baseContract, status: 'renewed' }, context)?.status, '완료');
    assert.equal(buildVendorContractRenewalSchedule({ ...baseContract, status: 'renewed' }, context)?.completedAt, undefined);
    assert.equal(buildVendorContractRenewalSchedule({ ...baseContract, status: 'archived' }, context)?.status, '취소');
});

void test('Given a sent disclosure When the eligible date exists Then one lead-scoped schedule is built', () => {
    const schedule = buildDisclosureEligibilitySchedule({
        companyId: 'company-1',
        disclosureSummary: {
            confirmedAt: null,
            contractEligibleAt: '2026-07-18T03:00:00.000Z',
            label: 'D-3',
            latestDeliveryId: 'delivery-1',
            latestDocumentTitle: '정보공개서',
            latestDocumentVersion: 'v1',
            latestSendStatus: 'sent',
            latestSentAt: '2026-07-04T03:00:00.000Z',
            openedAt: null,
            recipientEmail: 'owner@example.com',
            remainingDays: 3,
            state: 'sent',
            waitDays: 14
        },
        grade: 'A',
        id: 'lead-1',
        managerId: 'manager-1',
        name: '김점주',
        status: '상담중'
    }, new Date('2026-07-15T03:00:00.000Z'));

    assert.equal(schedule?.sourceType, 'disclosure-contract-eligible');
    assert.equal(schedule?.sourceId, 'lead-1');
    assert.equal(schedule?.date, '2026-07-18');
    assert.equal(schedule?.status, '예정');
    assert.equal(schedule?.metadata?.deliveryId, 'delivery-1');
    assert.equal(schedule?.metadata?.actionUrl, '/dashboard/franchise-leads?leadId=lead-1');
});

void test('Given an eligible disclosure or incomplete scope When building Then it completes or skips safely', () => {
    const eligibleLead = {
        companyId: 'company-1',
        disclosureSummary: {
            confirmedAt: '2026-07-01T03:00:00.000Z',
            contractEligibleAt: '2026-07-15T03:00:00.000Z',
            label: '계약 가능',
            latestDeliveryId: 'delivery-1',
            latestDocumentTitle: '정보공개서',
            latestDocumentVersion: 'v1',
            latestSendStatus: 'sent',
            latestSentAt: '2026-07-01T03:00:00.000Z',
            openedAt: null,
            recipientEmail: 'owner@example.com',
            remainingDays: 0,
            state: 'eligible',
            waitDays: 14
        },
        grade: 'A',
        id: 'lead-1',
        managerId: 'manager-1',
        name: '김점주',
        status: '상담중'
    } as const;

    assert.equal(buildDisclosureEligibilitySchedule(eligibleLead, new Date('2026-07-15T03:00:00.000Z'))?.status, '완료');
    assert.equal(buildDisclosureEligibilitySchedule(eligibleLead, new Date('2026-07-15T03:00:00.000Z'))?.completedAt, undefined);
    assert.equal(buildDisclosureEligibilitySchedule({ ...eligibleLead, companyId: null }, new Date()) , null);
    assert.equal(buildDisclosureEligibilitySchedule({ ...eligibleLead, disclosureSummary: null }, new Date()), null);
});
