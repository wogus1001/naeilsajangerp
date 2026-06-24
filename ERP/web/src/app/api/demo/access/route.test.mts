import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    DEMO_ACCESS_COOKIE_NAME,
    type DemoAccessConfig
} from '@/lib/demo-access';
import {
    handleDemoAccessDELETE,
    handleDemoAccessPOST
} from './route.js';

const config: DemoAccessConfig = {
    id: 'demo',
    password: 'secret',
    secret: 'cookie-secret'
};

function postRequest(body: Record<string, string>): Request {
    return new Request('http://localhost/api/demo/access', {
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
    });
}

test('Given matching demo credentials When posting access route Then a scoped httpOnly cookie is issued', async () => {
    const response = await handleDemoAccessPOST(postRequest({ id: 'demo', password: 'secret' }), {
        config,
        nowMs: () => 1_782_288_000_000,
        secureCookies: false
    });
    const payload = await response.json();
    const setCookie = response.headers.get('set-cookie') || '';

    assert.equal(response.status, 200);
    assert.deepEqual(payload, { data: { authenticated: true }, success: true });
    assert.match(setCookie, new RegExp(`${DEMO_ACCESS_COOKIE_NAME}=`));
    assert.match(setCookie, /Path=\/demo/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=lax/i);
});

test('Given wrong demo credentials When posting access route Then access is rejected', async () => {
    const response = await handleDemoAccessPOST(postRequest({ id: 'demo', password: 'wrong' }), {
        config,
        nowMs: () => 1_782_288_000_000,
        secureCookies: false
    });
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.code, 'AUTH_REQUIRED');
});

test('Given missing demo config When posting access route Then access fails closed', async () => {
    const response = await handleDemoAccessPOST(postRequest({ id: 'demo', password: 'secret' }), {
        config: null,
        nowMs: () => 1_782_288_000_000,
        secureCookies: false
    });

    assert.equal(response.status, 503);
});

test('Given demo logout request When deleting access route Then cookie is cleared', async () => {
    const response = handleDemoAccessDELETE(false);
    const setCookie = response.headers.get('set-cookie') || '';

    assert.equal(response.status, 200);
    assert.match(setCookie, new RegExp(`${DEMO_ACCESS_COOKIE_NAME}=`));
    assert.match(setCookie, /Max-Age=0/);
    assert.match(setCookie, /Path=\/demo/);
});
