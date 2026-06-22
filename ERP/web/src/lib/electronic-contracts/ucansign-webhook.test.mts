import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    extractUcansignWebhookPayloadInfo,
    isAuthorizedUcansignWebhook,
    normalizeUcansignWebhookStatus
} from './ucansign-webhook.js';

test('Given webhook status text When normalizing Then only supported contract statuses are returned', () => {
    assert.equal(normalizeUcansignWebhookStatus('documentComplete'), 'completed');
    assert.equal(normalizeUcansignWebhookStatus('cancelled'), 'canceled');
    assert.equal(normalizeUcansignWebhookStatus('rejected'), 'rejected');
    assert.equal(normalizeUcansignWebhookStatus('deleted'), 'deleted');
    assert.equal(normalizeUcansignWebhookStatus('participantSigned'), 'updated');
    assert.equal(normalizeUcansignWebhookStatus('모든 서명 완료'), 'completed');
    assert.equal(normalizeUcansignWebhookStatus('서명 완료'), 'updated');
    assert.equal(normalizeUcansignWebhookStatus('unknown-event'), null);
});

test('Given nested UCanSign webhook payload When extracting identifiers Then contract and document ids are found', () => {
    const payload = {
        event: {
            id: 'event-1',
            eventType: 'DOCUMENT_COMPLETED'
        },
        data: {
            custom_value: 'contract-1',
            document: {
                id: '2068871675408027649'
            }
        }
    };

    assert.deepEqual(extractUcansignWebhookPayloadInfo(payload), {
        contractId: 'contract-1',
        documentId: '2068871675408027649',
        rawStatus: 'DOCUMENT_COMPLETED'
    });
});

test('Given webhook secret When checking request Then bearer and custom header are accepted', () => {
    const bearerRequest = new Request('https://example.test/api/webhook', {
        headers: { Authorization: 'Bearer secret-1' }
    });
    const headerRequest = new Request('https://example.test/api/webhook', {
        headers: { 'x-ucansign-webhook-secret': 'secret-1' }
    });

    assert.equal(isAuthorizedUcansignWebhook(bearerRequest, 'secret-1'), true);
    assert.equal(isAuthorizedUcansignWebhook(headerRequest, 'secret-1'), true);
});

test('Given missing or wrong webhook secret When checking request Then request is rejected', () => {
    const request = new Request('https://example.test/api/webhook?secret=wrong');

    assert.equal(isAuthorizedUcansignWebhook(request, undefined), false);
    assert.equal(isAuthorizedUcansignWebhook(request, 'secret-1'), false);
});
