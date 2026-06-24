import assert from 'node:assert/strict';
import test from 'node:test';
import {
    DEMO_ACCESS_TTL_SECONDS,
    createDemoAccessToken,
    readDemoAccessConfig,
    verifyDemoAccessToken,
    verifyDemoCredentials,
    type DemoAccessConfig
} from './demo-access.js';

const config: DemoAccessConfig = {
    id: 'demo',
    password: 'secret',
    secret: 'cookie-secret'
};

test('Given matching demo credentials When verifying access Then credentials are accepted', () => {
    const result = verifyDemoCredentials({ id: 'demo', password: 'secret' }, config);

    assert.equal(result, true);
});

test('Given a fresh demo token When verifying access Then token is accepted', () => {
    const nowMs = 1_782_288_000_000;
    const token = createDemoAccessToken(config, nowMs);

    const result = verifyDemoAccessToken(token, config, nowMs + 1_000);

    assert.equal(result, true);
});

test('Given an expired demo token When verifying access Then token is rejected', () => {
    const nowMs = 1_782_288_000_000;
    const token = createDemoAccessToken(config, nowMs);
    const expiredMs = nowMs + (DEMO_ACCESS_TTL_SECONDS * 1_000) + 1;

    const result = verifyDemoAccessToken(token, config, expiredMs);

    assert.equal(result, false);
});

test('Given a tampered demo token When verifying access Then token is rejected', () => {
    const nowMs = 1_782_288_000_000;
    const token = createDemoAccessToken(config, nowMs);
    const tampered = `${token.slice(0, -1)}x`;

    const result = verifyDemoAccessToken(tampered, config, nowMs + 1_000);

    assert.equal(result, false);
});

test('Given missing demo env When reading config Then access is not configured', () => {
    const result = readDemoAccessConfig({});

    assert.equal(result, null);
});
