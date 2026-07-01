import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseUploadStorageTarget } from './upload-storage-policy.js';

test('Given property image upload path When parsing Then the property id is extracted', () => {
    assert.deepEqual(parseUploadStorageTarget({
        path: 'property-1/photo.jpg'
    }), {
        ok: true,
        target: {
            bucket: 'property-images',
            kind: 'propertyImage',
            path: 'property-1/photo.jpg',
            propertyId: 'property-1'
        }
    });
});

test('Given franchise lead document upload path When parsing Then company and lead scope are extracted', () => {
    assert.deepEqual(parseUploadStorageTarget({
        bucket: 'property-documents',
        path: 'franchise-lead-documents/company-1/lead-1/file.pdf'
    }), {
        ok: true,
        target: {
            bucket: 'property-documents',
            companyId: 'company-1',
            kind: 'leadDocument',
            leadId: 'lead-1',
            path: 'franchise-lead-documents/company-1/lead-1/file.pdf'
        }
    });
});

test('Given disclosure upload path When parsing Then company scope must match the path', () => {
    assert.deepEqual(parseUploadStorageTarget({
        bucket: 'property-documents',
        companyId: 'company-1',
        path: 'franchise-disclosures/company-1/file.pdf'
    }), {
        ok: true,
        target: {
            bucket: 'property-documents',
            companyId: 'company-1',
            kind: 'disclosure',
            path: 'franchise-disclosures/company-1/file.pdf'
        }
    });

    assert.deepEqual(parseUploadStorageTarget({
        bucket: 'property-documents',
        companyId: 'company-2',
        path: 'franchise-disclosures/company-1/file.pdf'
    }), {
        ok: false,
        error: 'Invalid disclosure storage path'
    });
});

test('Given vendor contract upload path When parsing Then company and contract scope are extracted', () => {
    assert.deepEqual(parseUploadStorageTarget({
        bucket: 'property-documents',
        companyId: 'company-1',
        path: 'franchise-vendor-contracts/company-1/contract-1/file.pdf'
    }), {
        ok: true,
        target: {
            bucket: 'property-documents',
            companyId: 'company-1',
            contractId: 'contract-1',
            kind: 'vendorContract',
            path: 'franchise-vendor-contracts/company-1/contract-1/file.pdf'
        }
    });

    assert.deepEqual(parseUploadStorageTarget({
        bucket: 'property-documents',
        companyId: 'company-2',
        path: 'franchise-vendor-contracts/company-1/contract-1/file.pdf'
    }), {
        ok: false,
        error: 'Invalid vendor contract storage path'
    });
});

test('Given unsafe upload targets When parsing Then the target is rejected before storage writes', () => {
    assert.deepEqual(parseUploadStorageTarget({
        bucket: 'avatars',
        path: 'user-1/avatar.png'
    }), {
        ok: false,
        error: 'Invalid upload bucket'
    });
    assert.deepEqual(parseUploadStorageTarget({
        bucket: 'property-documents',
        path: 'franchise-lead-documents/company-1/lead-1/../other.pdf'
    }), {
        ok: false,
        error: 'Invalid upload path'
    });
    assert.deepEqual(parseUploadStorageTarget({
        bucket: 'property-documents',
        path: 'unknown-prefix/file.pdf'
    }), {
        ok: false,
        error: 'Unsupported upload path'
    });
});
