import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveMetaWebhookTarget } from './meta-webhook-routing.js';

void test('resolveMetaWebhookTarget matches a Form only inside its connection company', () => {
    const target = resolveMetaWebhookTarget(
        [{ id: 'connection-a', company_id: 'company-a' }],
        [{ id: 'form-a', company_id: 'company-a', connection_id: 'connection-a' }]
    );

    assert.equal(target.status, 'matched');
    if (target.status === 'matched') {
        assert.equal(target.connection.id, 'connection-a');
        assert.equal(target.form.id, 'form-a');
    }
});

void test('resolveMetaWebhookTarget rejects an ambiguous Page and Form shared by companies', () => {
    const target = resolveMetaWebhookTarget(
        [
            { id: 'connection-a', company_id: 'company-a' },
            { id: 'connection-b', company_id: 'company-b' }
        ],
        [
            { id: 'form-a', company_id: 'company-a', connection_id: 'connection-a' },
            { id: 'form-b', company_id: 'company-b', connection_id: 'connection-b' }
        ]
    );

    assert.deepEqual(target, { status: 'ambiguous' });
});

void test('resolveMetaWebhookTarget rejects a cross-company Form and connection pair', () => {
    const target = resolveMetaWebhookTarget(
        [{ id: 'connection-a', company_id: 'company-a' }],
        [{ id: 'form-b', company_id: 'company-b', connection_id: 'connection-a' }]
    );

    assert.deepEqual(target, { status: 'missing' });
});
