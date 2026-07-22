import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    encodeGmailOAuthState,
    parseGmailOAuthCallbackState
} from './gmail-oauth-state.js';

const input = {
    nonce: 'nonce-123',
    requesterId: 'requester-123',
    companyId: 'company-123',
    redirectPath: '/dashboard/franchise-leads'
};

test('parseGmailOAuthCallbackState accepts the exact state issued at connect time', () => {
    const encodedState = encodeGmailOAuthState(input);

    assert.deepEqual(
        parseGmailOAuthCallbackState(encodedState, encodedState, input.nonce),
        input
    );
});

test('parseGmailOAuthCallbackState rejects a state whose requester was changed after issuance', () => {
    const issuedState = encodeGmailOAuthState(input);
    const changedState = encodeGmailOAuthState({
        ...input,
        requesterId: 'another-requester'
    });

    assert.equal(
        parseGmailOAuthCallbackState(changedState, issuedState, input.nonce),
        null
    );
});

test('parseGmailOAuthCallbackState rejects a missing or mismatched nonce cookie', () => {
    const encodedState = encodeGmailOAuthState(input);

    assert.equal(parseGmailOAuthCallbackState(encodedState, encodedState, null), null);
    assert.equal(parseGmailOAuthCallbackState(encodedState, encodedState, 'different-nonce'), null);
});
