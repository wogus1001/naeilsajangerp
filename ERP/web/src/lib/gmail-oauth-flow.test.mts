import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildGmailOAuthResultUrl,
    GMAIL_OAUTH_RESULT_MESSAGE_TYPE,
    parseGmailOAuthResultMessage
} from './gmail-oauth-flow.js';

test('Given popup OAuth When building the callback result Then it targets the popup completion page', () => {
    const url = buildGmailOAuthResultUrl({
        appUrl: 'https://www.fcerp.co.kr',
        completionMode: 'popup',
        redirectPath: '/dashboard/franchise-leads?tab=db',
        params: { gmail: 'connected', email: 'owner@example.com' }
    });

    assert.equal(url.origin, 'https://www.fcerp.co.kr');
    assert.equal(url.pathname, '/integrations/gmail/complete');
    assert.equal(url.searchParams.get('gmail'), 'connected');
    assert.equal(url.searchParams.get('email'), 'owner@example.com');
});

test('Given legacy redirect OAuth When building the callback result Then it preserves the safe return path', () => {
    const url = buildGmailOAuthResultUrl({
        appUrl: 'https://www.fcerp.co.kr',
        completionMode: 'redirect',
        redirectPath: '/dashboard/franchise-leads?tab=db',
        params: { gmail: 'error', reason: 'access_denied' }
    });

    assert.equal(url.pathname, '/dashboard/franchise-leads');
    assert.equal(url.searchParams.get('tab'), 'db');
    assert.equal(url.searchParams.get('gmail'), 'error');
    assert.equal(url.searchParams.get('reason'), 'access_denied');
});

test('Given an OAuth window message When parsing it Then only the Gmail result contract is accepted', () => {
    assert.deepEqual(parseGmailOAuthResultMessage({
        type: GMAIL_OAUTH_RESULT_MESSAGE_TYPE,
        gmail: 'connected',
        email: 'owner@example.com'
    }), {
        type: GMAIL_OAUTH_RESULT_MESSAGE_TYPE,
        gmail: 'connected',
        email: 'owner@example.com'
    });
    assert.equal(parseGmailOAuthResultMessage({ type: 'unknown', gmail: 'connected' }), null);
    assert.equal(parseGmailOAuthResultMessage(null), null);
});
