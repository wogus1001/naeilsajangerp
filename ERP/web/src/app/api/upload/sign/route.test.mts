import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from '@/lib/api-auth';
import { handleSignedUploadRequest } from './route.js';

const requester: RequesterProfile = {
    company_id: 'company-1',
    id: 'requester-1',
    role: 'manager'
};

function request(method: 'POST' | 'PUT', fileSize = 6 * 1024 * 1024) {
    return new Request('http://localhost/api/upload/sign', {
        body: JSON.stringify({
            bucket: 'property-images',
            fileName: 'store.jpg',
            fileSize,
            mimeType: 'image/jpeg',
            path: 'property-1/store.jpg'
        }),
        headers: { 'Content-Type': 'application/json' },
        method
    });
}

function jpegBlob(size = 6 * 1024 * 1024) {
    const bytes = new Uint8Array(size);
    bytes.set([0xff, 0xd8, 0xff]);
    return new Blob([bytes], { type: 'image/jpeg' });
}

test('Given a large property photo When requesting direct upload Then only metadata is signed by the API', async () => {
    const response = await handleSignedUploadRequest(request('POST'), {
        canUploadToResolvedTarget: async () => true,
        createSignedUploadUrl: async target => ({ data: { path: target.path, token: 'token' }, error: null }),
        downloadFile: async () => ({ data: null, error: null }),
        getPublicUrl: () => '',
        removeFile: async () => undefined,
        resolveRequester: async () => requester
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { path: 'property-1/store.jpg', token: 'token' });
});

test('Given a directly uploaded photo When finalizing Then its bytes are validated before returning the public URL', async () => {
    const publicUrl = 'https://storage.test/property-1/store.jpg';
    const response = await handleSignedUploadRequest(request('PUT'), {
        canUploadToResolvedTarget: async () => true,
        createSignedUploadUrl: async () => ({ data: null, error: null }),
        downloadFile: async () => ({ data: jpegBlob(), error: null }),
        getPublicUrl: () => publicUrl,
        removeFile: async () => undefined,
        resolveRequester: async () => requester
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { path: 'property-1/store.jpg', publicUrl });
});

test('Given spoofed photo bytes When finalizing Then the stored object is removed', async () => {
    let removals = 0;
    const response = await handleSignedUploadRequest(request('PUT'), {
        canUploadToResolvedTarget: async () => true,
        createSignedUploadUrl: async () => ({ data: null, error: null }),
        downloadFile: async () => ({ data: new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/jpeg' }), error: null }),
        getPublicUrl: () => '',
        removeFile: async () => {
            removals += 1;
        },
        resolveRequester: async () => requester
    });

    assert.equal(response.status, 400);
    assert.equal(removals, 1);
});
