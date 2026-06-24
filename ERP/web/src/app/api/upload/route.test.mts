import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleUploadRequest } from './route.js';
import type { RequesterProfile } from '@/lib/api-auth';

type FakeStorageCounters = {
    uploads: number;
};

const requester: RequesterProfile = {
    company_id: 'company-1',
    id: 'requester-1',
    role: 'manager'
};

function createUploadRequest(path: string): Request {
    const formData = new FormData();
    formData.append('file', new File(['contract'], 'contract.pdf', { type: 'application/pdf' }));
    formData.append('bucket', 'property-documents');
    formData.append('companyId', 'company-1');
    formData.append('leadId', 'lead-1');
    formData.append('path', path);
    formData.append('requesterId', requester.id);
    return new Request('http://localhost/api/upload', {
        body: formData,
        method: 'POST'
    });
}

test('Given unauthorized upload target When posting upload route Then storage upload is not called', async () => {
    const counters = { uploads: 0 };
    const response = await handleUploadRequest(
        createUploadRequest('franchise-lead-documents/company-1/lead-1/file.pdf'),
        {
            canUploadToResolvedTarget: async () => false,
            getPublicUrl: (target) => `https://storage.test/${target.path}`,
            resolveRequester: async () => requester,
            uploadFile: async (target) => {
                counters.uploads += 1;
                return {
                    data: { path: target.path },
                    error: null
                };
            }
        }
    );

    assert.equal(response.status, 403);
    assert.equal(counters.uploads, 0);
});

test('Given spoofed requester id form field without auth When posting upload route Then storage upload is not called', async () => {
    const counters = { canUploadChecks: 0, uploads: 0 };
    const response = await handleUploadRequest(
        createUploadRequest('franchise-lead-documents/company-1/lead-1/file.pdf'),
        {
            canUploadToResolvedTarget: async () => {
                counters.canUploadChecks += 1;
                return true;
            },
            getPublicUrl: (target) => `https://storage.test/${target.path}`,
            resolveRequester: async () => null,
            uploadFile: async (target) => {
                counters.uploads += 1;
                return {
                    data: { path: target.path },
                    error: null
                };
            }
        }
    );

    assert.equal(response.status, 401);
    assert.deepEqual(counters, {
        canUploadChecks: 0,
        uploads: 0
    });
});

test('Given authorized upload target When posting upload route Then storage upload is called once', async () => {
    const counters = { uploads: 0 };
    const response = await handleUploadRequest(
        createUploadRequest('franchise-lead-documents/company-1/lead-1/file.pdf'),
        {
            canUploadToResolvedTarget: async () => true,
            getPublicUrl: (target) => `https://storage.test/${target.path}`,
            resolveRequester: async () => requester,
            uploadFile: async (target) => {
                counters.uploads += 1;
                return {
                    data: { path: target.path },
                    error: null
                };
            }
        }
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(counters.uploads, 1);
    assert.deepEqual(payload, {
        path: 'franchise-lead-documents/company-1/lead-1/file.pdf',
        publicUrl: 'https://storage.test/franchise-lead-documents/company-1/lead-1/file.pdf',
        success: true
    });
});
