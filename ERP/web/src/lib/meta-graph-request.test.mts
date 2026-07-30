import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    fetchMetaForms,
    isMetaRequestTimeout,
    subscribeMetaPageToLeadgen
} from './meta-leads.js';

void test('Meta Graph requests keep Page tokens out of URL query strings', async (context) => {
    const requests: Array<{ readonly url: string; readonly init?: RequestInit }> = [];
    context.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
        requests.push({ url: String(input), init });
        return new Response(JSON.stringify({ data: [], success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    });

    await fetchMetaForms('page-1', 'page-secret-token');
    await subscribeMetaPageToLeadgen('page-1', 'page-secret-token');

    assert.equal(requests.length, 2);
    requests.forEach(request => {
        assert.equal(request.url.includes('page-secret-token'), false);
        assert.equal(new Headers(request.init?.headers).get('Authorization'), 'Bearer page-secret-token');
        assert.ok(request.init?.signal instanceof AbortSignal);
    });
});

void test('fetchMetaForms follows cursor pagination before resolving a refreshed Form', async (context) => {
    let requestCount = 0;
    context.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
        requestCount += 1;
        const url = new URL(String(input));
        if (requestCount === 1) {
            assert.equal(url.searchParams.get('after'), null);
            return new Response(JSON.stringify({
                data: [{ id: 'form-newest', name: '최신 양식' }],
                paging: { cursors: { after: 'cursor-2' } }
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        assert.equal(url.searchParams.get('after'), 'cursor-2');
        return new Response(JSON.stringify({
            data: [{ id: 'form-older', name: '이전 양식' }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const forms = await fetchMetaForms('page-1', 'page-secret-token');

    assert.equal(requestCount, 2);
    assert.deepEqual(forms.map(form => form.id), ['form-newest', 'form-older']);
});

void test('isMetaRequestTimeout recognizes aborted and timed-out requests', () => {
    const timeout = new Error('timed out');
    timeout.name = 'TimeoutError';
    const aborted = new Error('aborted');
    aborted.name = 'AbortError';

    assert.equal(isMetaRequestTimeout(timeout), true);
    assert.equal(isMetaRequestTimeout(aborted), true);
    assert.equal(isMetaRequestTimeout(new Error('provider failure')), false);
});
