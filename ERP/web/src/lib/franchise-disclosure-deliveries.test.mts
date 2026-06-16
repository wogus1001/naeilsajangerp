import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    addDisclosureWaitDays,
    canEnterContractStatus,
    getDisclosureEligibility,
    isContractLockedLeadStatus,
    normalizeDisclosureChannel,
    normalizeDisclosureSendStatus
} from './franchise-disclosure-deliveries.js';

test('addDisclosureWaitDays returns exactly 14 days after the sent timestamp', () => {
    const eligibleAt = addDisclosureWaitDays('2026-06-01T03:00:00.000Z');

    assert.equal(eligibleAt.toISOString(), '2026-06-15T03:00:00.000Z');
});

test('getDisclosureEligibility blocks contract status before 14 days have elapsed', () => {
    const eligibility = getDisclosureEligibility(
        [{ id: 'delivery-1', sentAt: '2026-06-01T03:00:00.000Z', documentTitle: '2026 정보공개서', documentVersion: 'v1' }],
        new Date('2026-06-14T03:00:00.000Z')
    );

    assert.equal(eligibility.hasDelivery, true);
    assert.equal(eligibility.isEligible, false);
    assert.equal(eligibility.remainingDays, 1);
    assert.equal(eligibility.contractEligibleAt, '2026-06-15T03:00:00.000Z');
    assert.equal(canEnterContractStatus('계약예정', eligibility), false);
    assert.equal(canEnterContractStatus('입지검토', eligibility), true);
});

test('getDisclosureEligibility allows contract status after the latest delivery is old enough', () => {
    const eligibility = getDisclosureEligibility(
        [{ id: 'delivery-1', sent_at: '2026-06-01T03:00:00.000Z', document_title: '2026 정보공개서', document_version: 'v1' }],
        new Date('2026-06-15T03:00:00.000Z')
    );

    assert.equal(eligibility.isEligible, true);
    assert.equal(eligibility.remainingDays, 0);
    assert.equal(canEnterContractStatus('계약완료', eligibility), true);
});

test('latest delivery controls eligibility when a newer disclosure was sent', () => {
    const eligibility = getDisclosureEligibility(
        [
            { id: 'old', sentAt: '2026-05-01T03:00:00.000Z', documentVersion: 'v1' },
            { id: 'new', sentAt: '2026-06-10T03:00:00.000Z', documentVersion: 'v2' }
        ],
        new Date('2026-06-15T03:00:00.000Z')
    );

    assert.equal(eligibility.latestDeliveryId, 'new');
    assert.equal(eligibility.latestDocumentVersion, 'v2');
    assert.equal(eligibility.isEligible, false);
    assert.equal(eligibility.contractEligibleAt, '2026-06-24T03:00:00.000Z');
});

test('normalizeDisclosureChannel and contract status guards fall back safely', () => {
    assert.equal(normalizeDisclosureChannel('email'), 'email');
    assert.equal(normalizeDisclosureChannel('postal'), 'manual');
    assert.equal(normalizeDisclosureChannel('in_person'), 'manual');
    assert.equal(normalizeDisclosureChannel('unknown'), 'manual');
    assert.equal(isContractLockedLeadStatus('계약예정'), true);
    assert.equal(isContractLockedLeadStatus('상담중'), false);
});

test('getDisclosureEligibility ignores pending and failed Gmail deliveries', () => {
    const eligibility = getDisclosureEligibility(
        [
            { id: 'failed', sentAt: '2026-06-01T03:00:00.000Z', sendStatus: 'failed' },
            { id: 'pending', sentAt: '2026-06-02T03:00:00.000Z', send_status: 'pending' },
            { id: 'sent', sentAt: '2026-06-03T03:00:00.000Z', sendStatus: 'sent' }
        ],
        new Date('2026-06-16T03:00:00.000Z')
    );

    assert.equal(eligibility.hasDelivery, true);
    assert.equal(eligibility.latestDeliveryId, 'sent');
    assert.equal(eligibility.isEligible, false);
    assert.equal(normalizeDisclosureSendStatus('unknown'), 'recorded');
});
