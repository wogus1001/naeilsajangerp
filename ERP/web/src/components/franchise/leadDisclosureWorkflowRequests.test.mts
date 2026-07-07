import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { deleteDisclosureDocumentRequest, sendDisclosureEmailRequest } from './leadDisclosureWorkflowRequests.js';

type FetchCall = {
    readonly url: string;
    readonly method?: string;
};

const originalFetch = globalThis.fetch;
let fetchCalls: readonly FetchCall[] = [];

afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchCalls = [];
});

test('Given a saved disclosure document When deleting it Then the archive endpoint receives document and requester ids', async () => {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        fetchCalls = [...fetchCalls, { url: String(input), method: init?.method }];
        return new Response(JSON.stringify({ success: true, data: { success: true } }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
        });
    };

    await deleteDisclosureDocumentRequest({
        requesterId: 'admin',
        documentId: 'document-1'
    });

    const [call] = fetchCalls;
    assert.ok(call);
    assert.equal(call.method, 'DELETE');

    const url = new URL(call.url, 'http://localhost:3000');
    assert.equal(url.pathname, '/api/franchise-disclosure-documents');
    assert.equal(url.searchParams.get('id'), 'document-1');
    assert.equal(url.searchParams.get('requesterId'), 'admin');
});

test('sendDisclosureEmailRequest includes customer phone in request body', async () => {
    let requestBody: unknown = null;
    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
        requestBody = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
        return new Response(JSON.stringify({ data: {} }), { status: 200 });
    };

    await sendDisclosureEmailRequest({
        requesterId: 'profile-1',
        leadId: 'lead-1',
        documentId: 'document-1',
        recipientName: '테스트_오지훈',
        recipientEmail: 'lead@example.com',
        recipientPhone: '010-6447-4633',
        memo: '발송 테스트'
    });

    assert.deepEqual(requestBody, {
        requesterId: 'profile-1',
        leadId: 'lead-1',
        documentId: 'document-1',
        recipientName: '테스트_오지훈',
        recipientEmail: 'lead@example.com',
        recipientPhone: '010-6447-4633',
        memo: '발송 테스트'
    });
});
