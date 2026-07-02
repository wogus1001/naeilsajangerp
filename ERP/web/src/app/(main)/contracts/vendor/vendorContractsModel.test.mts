import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildVendorContractQueue,
    canRenewContract,
    canTerminateContract,
    isContractInQueue,
    type VendorContract
} from './vendorContractsModel.js';

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
        status: 'renewal_due',
        statusLabel: '만료예정',
        storageBucket: '',
        storagePath: '',
        updatedAt: '2026-01-01T00:00:00.000Z',
        vendorId: '',
        vendorName: '내일식자재',
        ...overrides
    };
}

test('Given vendor contracts When building queue Then operational counts are grouped by lifecycle risk', () => {
    const contracts: readonly VendorContract[] = [
        contract({ id: 'renewal', status: 'renewal_due' }),
        contract({ id: 'expired', status: 'expired' }),
        contract({ id: 'ownerless', ownerProfileId: '', status: 'active' }),
        contract({ id: 'renewed', status: 'renewed' })
    ];

    const queue = buildVendorContractQueue(contracts);

    assert.deepEqual(queue.map(item => [item.key, item.count]), [
        ['all', 4],
        ['renewal', 1],
        ['expired', 1],
        ['ownerless', 1],
        ['terminal', 1]
    ]);
});

test('Given selected queue filters When checking contracts Then only matching lifecycle rows remain', () => {
    assert.equal(isContractInQueue(contract({ status: 'renewal_due' }), 'renewal'), true);
    assert.equal(isContractInQueue(contract({ status: 'active' }), 'renewal'), false);
    assert.equal(isContractInQueue(contract({ ownerProfileId: '' }), 'ownerless'), true);
});

test('Given terminal contracts When checking action availability Then renewal and termination are blocked', () => {
    assert.equal(canRenewContract(contract({ status: 'renewed' })), false);
    assert.equal(canTerminateContract(contract({ status: 'terminated' })), false);
    assert.equal(canRenewContract(contract({ status: 'expired' })), true);
});
