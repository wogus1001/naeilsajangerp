import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildMutationPayload,
    isActiveVendorContractOwner,
    validateVendorContractStorage,
    VENDOR_CONTRACT_STORAGE_BUCKET
} from './vendorContractRouteHelpers.js';

const requester = {
    company_id: 'company-1',
    email: 'manager@example.com',
    id: 'profile-1',
    login_id: 'manager',
    name: '관리자',
    role: 'manager',
    status: 'active'
};

test('Given a vendor contract upload When path is outside company Then storage validation rejects it', () => {
    assert.deepEqual(validateVendorContractStorage({
        storageBucket: VENDOR_CONTRACT_STORAGE_BUCKET,
        storagePath: 'franchise-vendor-contracts/company-2/contract-1/file.pdf'
    }, 'company-1'), {
        ok: false,
        status: 403,
        message: '업로드 문서 경로의 회사 범위가 일치하지 않습니다.'
    });
});

test('Given a vendor contract upload When bucket is arbitrary Then storage validation rejects it', () => {
    assert.deepEqual(validateVendorContractStorage({
        storageBucket: 'property-images',
        storagePath: 'franchise-vendor-contracts/company-1/contract-1/file.pdf'
    }, 'company-1'), {
        ok: false,
        status: 400,
        message: '업로드 문서 버킷이 올바르지 않습니다.'
    });
});

test('Given a valid vendor contract upload When building mutation Then storage bucket is fixed', () => {
    const payload = buildMutationPayload({
        contractTitle: '계약서',
        storageBucket: 'property-documents',
        storagePath: 'franchise-vendor-contracts/company-1/contract-1/file.pdf',
        vendorName: '테스트업체'
    }, 'company-1', requester, 'create');

    assert.equal(payload.storage_bucket, VENDOR_CONTRACT_STORAGE_BUCKET);
    assert.equal(payload.storage_path, 'franchise-vendor-contracts/company-1/contract-1/file.pdf');
});

test('Given a contract owner from another company When validating Then the owner is rejected', async () => {
    const query = {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
            return {
                data: { company_id: 'company-2', id: 'profile-2', status: 'active' },
                error: null
            };
        }
    };
    const client = { from() { return query; } };

    assert.equal(await isActiveVendorContractOwner(client as never, 'profile-2', 'company-1'), false);
});
