import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchApprovalFile } from './approvalDownloads.js';

void test('Given API auth headers When downloading a PDF Then the bearer token reaches fetch', async () => {
    const expectedPdf = new Uint8Array(Buffer.from('%PDF-authenticated'));
    let receivedAuthorization = '';

    const blob = await fetchApprovalFile('/api/approvals/documents/document-id/pdf', {
        getHeaders: async () => new Headers({ Authorization: 'Bearer test-access-token' }),
        fetcher: async (input, init) => {
            assert.equal(input, '/api/approvals/documents/document-id/pdf');
            receivedAuthorization = new Headers(init.headers).get('Authorization') || '';
            return new Response(Uint8Array.from(expectedPdf), { headers: { 'Content-Type': 'application/pdf' } });
        }
    });

    assert.equal(receivedAuthorization, 'Bearer test-access-token');
    assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), expectedPdf);
});

void test('Given an API error When downloading a PDF Then the server message is preserved', async () => {
    await assert.rejects(
        fetchApprovalFile('/api/approvals/documents/document-id/pdf', {
            getHeaders: async () => new Headers(),
            fetcher: async () => Response.json({ message: 'Authenticated session is required' }, { status: 401 })
        }),
        /Authenticated session is required/
    );
});
