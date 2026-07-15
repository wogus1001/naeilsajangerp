import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from '@/lib/api-auth';
import type { VendorContractRow } from '@/lib/franchise-vendor-contracts';
import { buildVendorContractScheduleForSync } from './vendorContractScheduleSync.js';

const requester: RequesterProfile = {
    company_id: 'company-1',
    id: 'manager-1',
    role: 'manager'
};

function vendorContractRow(overrides: Partial<VendorContractRow> = {}): VendorContractRow {
    return {
        category: 'logistics',
        company_id: 'company-1',
        contract_end_date: '2026-07-31',
        contract_start_date: '2026-01-01',
        contract_title: '물류 계약',
        created_at: '2026-01-01T00:00:00.000Z',
        created_by: 'manager-1',
        data: {},
        document_source: 'manual',
        electronic_contract_id: null,
        file_name: null,
        id: 'contract-1',
        memo: null,
        owner_profile_id: 'staff-1',
        status: 'active',
        storage_bucket: null,
        storage_path: null,
        updated_at: '2026-07-15T00:00:00.000Z',
        vendor_id: 'vendor-1',
        vendor_name: '내일물류',
        ...overrides
    };
}

test('Given a contract end date is cleared When syncing Then the previous source schedule is cancelled on its original date', () => {
    const schedule = buildVendorContractScheduleForSync({
        previousContractEndDate: '2026-07-31',
        requester,
        row: vendorContractRow({ contract_end_date: null })
    });

    assert.equal(schedule?.date, '2026-07-31');
    assert.equal(schedule?.sourceId, 'contract-1');
    assert.equal(schedule?.status, '취소');
});

test('Given a current contract end date When syncing Then the current lifecycle schedule is used', () => {
    const schedule = buildVendorContractScheduleForSync({
        previousContractEndDate: '2026-07-20',
        requester,
        row: vendorContractRow({ contract_end_date: '2026-08-31' })
    });

    assert.equal(schedule?.date, '2026-08-31');
    assert.notEqual(schedule?.status, '취소');
});
