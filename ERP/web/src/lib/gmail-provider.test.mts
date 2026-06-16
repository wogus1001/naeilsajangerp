import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import {
    getGmailRedirectUri,
    getGmailRedirectUriFromRequest
} from './gmail-provider.js';

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

after(() => {
    if (originalAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
        return;
    }
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
});

test('getGmailRedirectUri uses the current local request host for OAuth cookie continuity', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

    assert.equal(
        getGmailRedirectUri('http://127.0.0.1:3000/api/integrations/gmail/connect'),
        'http://127.0.0.1:3000/api/integrations/gmail/callback'
    );
    assert.equal(
        getGmailRedirectUri('http://localhost:3000/api/integrations/gmail/connect'),
        'http://localhost:3000/api/integrations/gmail/callback'
    );
});

test('getGmailRedirectUri keeps the configured production origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://naeilsajang.vercel.app/';

    assert.equal(
        getGmailRedirectUri('http://localhost:3000/api/integrations/gmail/connect'),
        'https://naeilsajang.vercel.app/api/integrations/gmail/callback'
    );
});

test('getGmailRedirectUriFromRequest prefers the actual host header when Next normalizes request.url', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    const request = new Request('http://localhost:3000/api/integrations/gmail/connect', {
        headers: { host: '127.0.0.1:3000' }
    });

    assert.equal(
        getGmailRedirectUriFromRequest(request),
        'http://127.0.0.1:3000/api/integrations/gmail/callback'
    );
});
