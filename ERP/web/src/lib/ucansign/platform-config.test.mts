import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getPremiumRightsTemplateId,
    missingUcansignSendEnv,
    missingUcansignWebhookEnv
} from './platform-config.js';

test('Given complete platform env When checking send config Then no missing env is returned', () => {
    const env = {
        UCANSIGN_CLIENT_ID: 'client-id',
        UCANSIGN_CLIENT_SECRET: 'client-secret',
        UCANSIGN_TOKEN_ENCRYPTION_KEY: 'encryption-key',
        UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID: 'template-id'
    };

    assert.deepEqual(missingUcansignSendEnv(env), []);
    assert.equal(getPremiumRightsTemplateId(env), 'template-id');
});

test('Given missing template env When checking send config Then template id is reported', () => {
    const env = {
        UCANSIGN_CLIENT_ID: 'client-id',
        UCANSIGN_CLIENT_SECRET: 'client-secret',
        UCANSIGN_TOKEN_ENCRYPTION_KEY: 'encryption-key'
    };

    assert.deepEqual(missingUcansignSendEnv(env), ['UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID']);
    assert.equal(getPremiumRightsTemplateId(env), '');
});

test('Given webhook env When checking webhook config Then missing secret is reported', () => {
    assert.deepEqual(missingUcansignWebhookEnv({}), ['UCANSIGN_WEBHOOK_SECRET']);
    assert.deepEqual(missingUcansignWebhookEnv({ UCANSIGN_WEBHOOK_SECRET: 'secret-1' }), []);
});
