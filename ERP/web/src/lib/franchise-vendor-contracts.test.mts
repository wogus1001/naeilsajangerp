import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    canRenewVendorContractStatus,
    canTerminateVendorContractStatus,
    daysUntilDate,
    deriveVendorContractStatus,
    normalizeVendorContractStatus,
    toVendorContractView,
    vendorContractDdayLabel
} from './franchise-vendor-contracts.js';
import {
    normalizeVendorContractEventType,
    toVendorContractEventView
} from './franchise-vendor-contract-events.js';

test('Given a contract expiring in 30 days When deriving status Then it becomes renewal due', () => {
    const status = deriveVendorContractStatus({
        contractEndDate: '2026-07-31',
        explicitStatus: 'active'
    }, new Date('2026-07-01T09:00:00+09:00'));

    assert.equal(status, 'renewal_due');
});

test('Given a contract already ended When deriving status Then it becomes expired', () => {
    const status = deriveVendorContractStatus({
        contractEndDate: '2026-06-30',
        explicitStatus: 'active'
    }, new Date('2026-07-01T09:00:00+09:00'));

    assert.equal(status, 'expired');
});

test('Given a terminated contract When deriving status Then the explicit terminal status is kept', () => {
    const status = deriveVendorContractStatus({
        contractEndDate: '2026-07-31',
        explicitStatus: 'terminated'
    }, new Date('2026-07-01T09:00:00+09:00'));

    assert.equal(status, 'terminated');
});

test('Given a vendor contract row When transforming Then labels and D-day are normalized', () => {
    const view = toVendorContractView({
        category: 'food_material',
        company_id: 'company-1',
        contract_end_date: '2026-07-08',
        contract_start_date: '2026-01-01',
        contract_title: '식자재 공급 계약',
        created_at: '2026-01-01T00:00:00.000Z',
        created_by: 'manager-1',
        data: {},
        document_source: 'upload',
        electronic_contract_id: null,
        file_name: 'contract.pdf',
        id: 'contract-1',
        memo: null,
        owner_profile_id: 'manager-1',
        status: 'active',
        storage_bucket: 'property-documents',
        storage_path: 'franchise-vendor-contracts/company-1/contract-1/file.pdf',
        updated_at: '2026-01-02T00:00:00.000Z',
        vendor_id: 'vendor-1',
        vendor_name: '내일식자재'
    }, new Date('2026-07-01T09:00:00+09:00'));

    assert.equal(view.categoryLabel, '식자재');
    assert.equal(view.vendorId, 'vendor-1');
    assert.equal(view.status, 'renewal_due');
    assert.equal(view.statusLabel, '만료예정');
    assert.equal(view.ddayLabel, 'D-7');
});

test('Given invalid end date When formatting D-day Then it returns a blank marker', () => {
    assert.equal(daysUntilDate('invalid-date', new Date('2026-07-01T09:00:00+09:00')), null);
    assert.equal(vendorContractDdayLabel(null), '-');
});

test('Given invalid status and event values When normalizing Then safe defaults are returned', () => {
    assert.equal(normalizeVendorContractStatus('unknown'), 'active');
    assert.equal(normalizeVendorContractEventType('bad-event'), 'updated');
});

test('Given terminal and active statuses When checking available actions Then only active lifecycle statuses can change', () => {
    assert.equal(canRenewVendorContractStatus('active'), true);
    assert.equal(canRenewVendorContractStatus('renewal_due'), true);
    assert.equal(canRenewVendorContractStatus('expired'), true);
    assert.equal(canRenewVendorContractStatus('terminated'), false);
    assert.equal(canTerminateVendorContractStatus('renewed'), false);
});

test('Given a vendor contract event row When transforming Then labels and status labels are normalized', () => {
    const event = toVendorContractEventView({
        company_id: 'company-1',
        contract_id: 'contract-1',
        created_at: '2026-07-01T00:00:00.000Z',
        created_by: 'manager-1',
        data: {},
        event_type: 'renewed',
        id: 'event-1',
        next_contract_id: 'contract-2',
        next_status: 'renewed',
        previous_status: 'renewal_due',
        reason: '단가 갱신'
    });

    assert.equal(event.eventLabel, '갱신 처리');
    assert.equal(event.previousStatusLabel, '만료예정');
    assert.equal(event.nextStatusLabel, '갱신완료');
    assert.equal(event.nextContractId, 'contract-2');
});
