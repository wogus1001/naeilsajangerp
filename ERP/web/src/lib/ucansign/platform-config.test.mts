import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getPremiumRightsTemplateId,
    missingUcansignPlatformEnv,
    missingUcansignPremiumRightsEnv,
    missingUcansignSendEnv,
    missingUcansignWebhookEnv
} from './platform-config.js';

test('Given complete platform env When checking send config Then no missing env is returned', () => {
    const env = {
        UCANSIGN_API_KEY: 'api-key',
        UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID: 'template-id'
    };

    assert.deepEqual(missingUcansignPlatformEnv(env), []);
    assert.deepEqual(missingUcansignPremiumRightsEnv(env), []);
    assert.deepEqual(missingUcansignSendEnv(env), []);
    assert.equal(getPremiumRightsTemplateId(env), 'template-id');
});

test('Given missing template env When checking send config Then template id is reported', () => {
    const env = {
        UCANSIGN_API_KEY: 'api-key'
    };

    assert.deepEqual(missingUcansignPlatformEnv(env), []);
    assert.deepEqual(missingUcansignPremiumRightsEnv(env), ['UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID']);
    assert.deepEqual(missingUcansignSendEnv(env), ['UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID']);
    assert.equal(getPremiumRightsTemplateId(env), '');
});

test('Given missing API key When checking platform config Then API key is reported', () => {
    assert.deepEqual(missingUcansignPlatformEnv({}), ['UCANSIGN_API_KEY']);
    assert.deepEqual(missingUcansignPremiumRightsEnv({}), ['UCANSIGN_API_KEY', 'UCANSIGN_PREMIUM_RIGHTS_TEMPLATE_ID']);
});

test('Given webhook env When checking webhook config Then missing secret is reported', () => {
    assert.deepEqual(missingUcansignWebhookEnv({}), ['UCANSIGN_WEBHOOK_SECRET']);
    assert.deepEqual(missingUcansignWebhookEnv({ UCANSIGN_WEBHOOK_SECRET: 'secret-1' }), []);
});
