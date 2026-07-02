import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FranchiseVendorView } from '@/lib/franchise-vendors.js';
import type { VendorContract } from '../../contracts/vendor/vendorContractsModel.js';
import {
    buildVendorManagementRows,
    buildVendorManagementMetrics,
    buildVendorSummaries,
    filterVendorSummaries
} from './vendorManagementModel.js';

function contract(overrides: Partial<VendorContract>): VendorContract {
    return {
        category: 'food_material',
        categoryLabel: '식자재',
        companyId: 'company-1',
        contractEndDate: '2026-07-31',
        contractStartDate: '2026-01-01',
        contractTitle: '식자재 공급 계약',
        createdAt: '2026-01-01T00:00:00.000Z',
        createdBy: 'manager-1',
        ddayLabel: 'D-30',
        documentSource: 'manual',
        electronicContractId: '',
        fileName: '',
        id: 'contract-1',
        memo: '',
        ownerProfileId: 'manager-1',
        remainingDays: 30,
        status: 'active',
        statusLabel: '진행중',
        storageBucket: '',
        storagePath: '',
        updatedAt: '2026-01-01T00:00:00.000Z',
        vendorId: '',
        vendorName: '내일식자재',
        ...overrides
    };
}

function vendor(overrides: Partial<FranchiseVendorView>): FranchiseVendorView {
    return {
        businessNumber: '',
        category: 'food_material',
        categoryLabel: '식자재',
        companyId: 'company-1',
        contactEmail: '',
        contactName: '',
        contactPhone: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        createdBy: 'manager-1',
        id: 'vendor-1',
        memo: '',
        status: 'active',
        statusLabel: '거래중',
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedBy: 'manager-1',
        vendorName: '내일식자재',
        ...overrides
    };
}

test('Given contracts from the same vendor When building summaries Then rows are grouped by vendor name', () => {
    const summaries = buildVendorSummaries([
        contract({ id: 'a', vendorName: '내일식자재', status: 'active' }),
        contract({ id: 'b', vendorName: '내일식자재', status: 'renewal_due', contractEndDate: '2026-07-10' }),
        contract({ id: 'c', vendorName: '내일물류', categoryLabel: '물류' })
    ]);

    assert.equal(summaries.length, 2);
    assert.equal(summaries[0]?.vendorName, '내일식자재');
    assert.equal(summaries[0]?.contractCount, 2);
    assert.equal(summaries[0]?.renewalDueCount, 1);
    assert.equal(summaries[0]?.riskLevel, 'warning');
    assert.equal(summaries[0]?.nextContractId, 'b');
});

test('Given contracts linked to a vendor master When vendor names differ Then rows are grouped by vendor id', () => {
    const summaries = buildVendorSummaries([
        contract({ id: 'a', vendorId: 'vendor-master', vendorName: '내일식자재' }),
        contract({ id: 'b', vendorId: 'vendor-master', vendorName: '내일 식자재 본사', status: 'renewal_due' })
    ]);
    const rows = buildVendorManagementRows([
        vendor({ id: 'vendor-master', vendorName: '내일식자재', contactName: '김담당' })
    ], summaries);

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.masterId, 'vendor-master');
    assert.equal(rows[0]?.vendorName, '내일식자재');
    assert.equal(rows[0]?.contactName, '김담당');
    assert.equal(rows[0]?.contractCount, 2);
});

test('Given expired and closed vendors When sorting Then risky vendors are shown first', () => {
    const summaries = buildVendorSummaries([
        contract({ id: 'closed', status: 'terminated', vendorName: '종료업체' }),
        contract({ id: 'active', status: 'active', vendorName: '정상업체' }),
        contract({ id: 'expired', status: 'expired', vendorName: '만료업체' })
    ]);

    assert.deepEqual(summaries.map(summary => summary.riskLevel), ['danger', 'normal', 'closed']);
    assert.equal(summaries[0]?.vendorName, '만료업체');
});

test('Given vendor summaries When filtering Then keyword and risk are both applied', () => {
    const summaries = buildVendorSummaries([
        contract({ id: 'a', status: 'active', vendorName: '내일식자재' }),
        contract({ id: 'b', status: 'expired', vendorName: '하남인테리어', categoryLabel: '인테리어/시공' })
    ]);
    const rows = buildVendorManagementRows([], summaries);

    assert.deepEqual(filterVendorSummaries(rows, '하남', 'all').map(summary => summary.vendorName), ['하남인테리어']);
    assert.deepEqual(filterVendorSummaries(rows, '', 'danger').map(summary => summary.vendorName), ['하남인테리어']);
});

test('Given vendor masters without contracts When building rows Then vendors are still listed', () => {
    const rows = buildVendorManagementRows(
        [vendor({ contactName: '김담당', id: 'vendor-master', vendorName: '미사마케팅' })],
        buildVendorSummaries([contract({ id: 'a', status: 'active', vendorName: '내일식자재' })])
    );

    assert.deepEqual(rows.map(row => row.vendorName), ['내일식자재', '미사마케팅']);
    assert.equal(rows[1]?.masterId, 'vendor-master');
    assert.equal(rows[1]?.contactName, '김담당');
    assert.equal(rows[1]?.contractCount, 0);
});

test('Given vendor summaries When building metrics Then headline counts use vendor level risk', () => {
    const rows = buildVendorManagementRows([], buildVendorSummaries([
        contract({ id: 'a', status: 'active', vendorName: '내일식자재' }),
        contract({ id: 'b', status: 'renewal_due', vendorName: '내일식자재' }),
        contract({ id: 'c', status: 'expired', vendorName: '하남인테리어', categoryLabel: '인테리어/시공' })
    ]));

    assert.deepEqual(buildVendorManagementMetrics(rows), {
        activeContracts: 2,
        expiringVendors: 2,
        totalContracts: 3,
        totalVendors: 2
    });
});
