import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { EMPTY_LEAD_CHECKLIST_SUMMARY } from './leadDetailRuntime.js';
import { LIVE_LEAD_DETAIL_RUNTIME } from './leadDetailLiveRuntime.js';

type FetchCall = {
    readonly url: string;
    readonly init?: RequestInit;
};

const originalFetch = globalThis.fetch;
let fetchCalls: readonly FetchCall[] = [];

afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchCalls = [];
});

function response(data: unknown): Response {
    return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requestBody(call: FetchCall): Record<string, unknown> {
    const body = call.init?.body;
    if (typeof body !== 'string') throw new TypeError('request body must be JSON text');
    const value: unknown = JSON.parse(body);
    assert.ok(isRecord(value));
    return value;
}

function installLiveResponseRouter(): void {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        fetchCalls = [...fetchCalls, { url, init }];
        if (url.includes('/api/franchise-disclosure-documents')) {
            return response({ documents: [] });
        }
        if (url.includes('/api/franchise-lead-disclosures')) {
            return response({ deliveries: [], eligibility: null });
        }
        if (url.includes('/api/franchise-lead-contract-checklist')) {
            return response({ steps: [], summary: EMPTY_LEAD_CHECKLIST_SUMMARY });
        }
        if (url.includes('/api/electronic-contracts')) {
            return response({
                contracts: [
                    { id: 'signed', name: '서명 문서', status: 'completed' },
                    { id: 'draft', name: '작성 문서', status: 'draft' }
                ]
            });
        }
        if (url.includes('/api/upload')) return response({ path: 'company/lead/file.pdf' });
        if (url.includes('/api/franchise-lead-documents')) {
            return url.includes('action=open')
                ? response({ url: 'memory://lead-document/doc-1' })
                : response({ documents: [] });
        }
        if (url.includes('/api/franchise-locations')) {
            return response({
                locations: [{ id: 'store-1', name: '샘플점', status: '오픈준비' }],
                location: { id: 'store-1', name: '샘플점', status: '오픈준비' }
            });
        }
        if (url.includes('/api/franchise-leads/contract-store')) {
            return response({
                location: { id: 'store-1', name: '샘플점', status: '오픈준비' },
                created: true
            });
        }
        if (url.includes('/api/franchise-opening-projects')) {
            return response({
                projects: [{ id: 'opening-1', status: '진행중' }],
                project: { id: 'opening-1', status: '진행중' }
            });
        }
        throw new TypeError(`Unexpected live runtime request: ${url}`);
    };
}

test('Given the production runtime When disclosure and checklist state load Then the existing endpoints and query contract are preserved', async () => {
    // Given
    installLiveResponseRouter();

    // When
    await Promise.all([
        LIVE_LEAD_DETAIL_RUNTIME.disclosure.load({
            userId: 'user-1',
            leadId: 'lead-1',
            companyId: 'company-1',
            companyName: '샘플 본사'
        }),
        LIVE_LEAD_DETAIL_RUNTIME.checklist.load({ userId: 'user-1', leadId: 'lead-1' })
    ]);

    // Then
    const urls = fetchCalls.map(call => new URL(call.url, 'http://localhost'));
    assert.ok(urls.some(url => url.pathname === '/api/franchise-disclosure-documents'
        && url.searchParams.get('companyId') === 'company-1'));
    assert.ok(urls.some(url => url.pathname === '/api/franchise-lead-disclosures'
        && url.searchParams.get('leadId') === 'lead-1'));
    assert.ok(urls.some(url => url.pathname === '/api/franchise-lead-contract-checklist'
        && url.searchParams.get('requesterId') === 'user-1'));
});

test('Given the production runtime When checklist and document mutations run Then their existing methods and JSON payloads are preserved', async () => {
    // Given
    installLiveResponseRouter();

    // When
    await LIVE_LEAD_DETAIL_RUNTIME.checklist.saveStep({
        userId: 'user-1',
        leadId: 'lead-1',
        stepKey: 'franchise-contract',
        patch: { completed: true, memo: '서명 완료' }
    });
    await LIVE_LEAD_DETAIL_RUNTIME.documents.create({
        leadId: 'lead-1',
        title: '가맹계약서',
        sourceType: 'electronic_contract',
        sourceId: 'contract-1',
        documentStatus: 'stored',
        fileName: '',
        storageBucket: '',
        storagePath: '',
        memo: '서명 완료',
        checklistStepKey: 'franchise-contract'
    });

    // Then
    const checklistCall = fetchCalls.find(call => call.url === '/api/franchise-lead-contract-checklist');
    const documentCall = fetchCalls.find(call => call.url === '/api/franchise-lead-documents');
    assert.ok(checklistCall);
    assert.equal(checklistCall.init?.method, 'PUT');
    assert.deepEqual(requestBody(checklistCall), {
        requesterId: 'user-1',
        leadId: 'lead-1',
        stepKey: 'franchise-contract',
        completed: true,
        memo: '서명 완료'
    });
    assert.ok(documentCall);
    assert.equal(documentCall.init?.method, 'POST');
    assert.equal(requestBody(documentCall).sourceId, 'contract-1');
});

test('Given the production runtime When store and opening workflows run Then the existing read and write endpoints remain selected', async () => {
    // Given
    installLiveResponseRouter();
    const form = {
        name: '샘플점',
        brand: '샘플 브랜드',
        status: '오픈준비',
        region: '서울',
        address: '서울시 중구',
        latitude: 37.5,
        longitude: 127,
        openedAt: '2026-08-01',
        memo: '오픈 준비'
    };

    // When
    await LIVE_LEAD_DETAIL_RUNTIME.store.create({
        leadId: 'lead-1',
        form,
        sourceType: 'direct',
        sourceId: '',
        userId: 'user-1',
        companyName: '샘플 본사'
    });
    await LIVE_LEAD_DETAIL_RUNTIME.opening.load({
        leadId: 'lead-1',
        userId: 'user-1',
        companyName: '샘플 본사'
    });

    // Then
    const paths = fetchCalls.map(call => new URL(call.url, 'http://localhost').pathname);
    assert.ok(paths.includes('/api/franchise-leads/contract-store'));
    assert.ok(paths.includes('/api/franchise-locations'));
    assert.ok(paths.includes('/api/franchise-opening-projects'));
    const createCall = fetchCalls.find(call => call.url === '/api/franchise-leads/contract-store');
    assert.ok(createCall);
    assert.deepEqual(requestBody(createCall).draft, form);
});

test('Given an existing operations store When linking it to a contract lead Then the contract-store endpoint receives an explicit link action', async () => {
    // Given
    installLiveResponseRouter();

    // When
    await LIVE_LEAD_DETAIL_RUNTIME.store.link({
        leadId: 'lead-1',
        locationId: 'store-1',
        userId: 'user-1',
        companyName: '샘플 본사'
    });

    // Then
    const linkCall = fetchCalls.find(call => call.url === '/api/franchise-leads/contract-store');
    assert.ok(linkCall);
    assert.equal(linkCall.init?.method, 'POST');
    assert.deepEqual(requestBody(linkCall), {
        requesterId: 'user-1',
        companyName: '샘플 본사',
        action: 'link_existing',
        leadId: 'lead-1',
        locationId: 'store-1'
    });
});
