import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    encodeMetaOAuthState,
    parseMetaOAuthCallbackState
} from './meta-oauth-state.js';

const input = {
    nonce: 'nonce-123',
    requesterId: 'requester-123',
    companyId: 'company-123',
    redirectPath: '/dashboard/franchise-leads'
};

test('parseMetaOAuthCallbackState accepts the exact state issued at connect time', () => {
    // Given
    const encodedState = encodeMetaOAuthState(input);

    // When
    const state = parseMetaOAuthCallbackState(encodedState, encodedState, input.nonce);

    // Then
    assert.deepEqual(state, input);
});

test('parseMetaOAuthCallbackState rejects a requester changed after state issuance', () => {
    // Given
    const issuedState = encodeMetaOAuthState(input);
    const changedState = encodeMetaOAuthState({
        ...input,
        requesterId: 'another-requester'
    });

    // When
    const state = parseMetaOAuthCallbackState(changedState, issuedState, input.nonce);

    // Then
    assert.equal(state, null);
});

test('parseMetaOAuthCallbackState rejects a company changed after state issuance', () => {
    // Given
    const issuedState = encodeMetaOAuthState(input);
    const changedState = encodeMetaOAuthState({
        ...input,
        companyId: 'another-company'
    });

    // When
    const state = parseMetaOAuthCallbackState(changedState, issuedState, input.nonce);

    // Then
    assert.equal(state, null);
});

test('parseMetaOAuthCallbackState rejects a missing or mismatched nonce cookie', () => {
    // Given
    const encodedState = encodeMetaOAuthState(input);

    // When
    const missingNonceState = parseMetaOAuthCallbackState(encodedState, encodedState, null);
    const mismatchedNonceState = parseMetaOAuthCallbackState(encodedState, encodedState, 'different-nonce');

    // Then
    assert.equal(missingNonceState, null);
    assert.equal(mismatchedNonceState, null);
});
