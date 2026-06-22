import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createUcansignTemplateLinkState,
    verifyUcansignTemplateLinkState
} from './template-link-state';

test('verifies a signed UCanSign template link state', () => {
    const state = createUcansignTemplateLinkState({
        templateId: 'template-1',
        versionId: 'version-1',
        ttlMs: 1_000
    }, 'secret');

    const verified = verifyUcansignTemplateLinkState(state, 'secret', Date.now());

    assert.deepEqual(verified && {
        templateId: verified.templateId,
        versionId: verified.versionId
    }, {
        templateId: 'template-1',
        versionId: 'version-1'
    });
});

test('rejects a tampered UCanSign template link state', () => {
    const state = createUcansignTemplateLinkState({
        templateId: 'template-1',
        versionId: 'version-1',
        ttlMs: 1_000
    }, 'secret');

    const [payload, signature] = state.split('.');
    assert.ok(payload);
    assert.ok(signature);
    const tamperedPayload = `${payload.slice(0, -1)}${payload.endsWith('a') ? 'b' : 'a'}`;
    const tampered = `${tamperedPayload}.${signature}`;

    assert.equal(verifyUcansignTemplateLinkState(tampered, 'secret'), null);
});

test('rejects an expired UCanSign template link state', () => {
    const createdAt = Date.now();
    const state = createUcansignTemplateLinkState({
        templateId: 'template-1',
        versionId: 'version-1',
        ttlMs: 1
    }, 'secret');

    assert.equal(verifyUcansignTemplateLinkState(state, 'secret', createdAt + 2), null);
});
