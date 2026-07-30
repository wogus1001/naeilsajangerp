import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getMetaCallbackFailureReason,
    getMetaProviderDenialReason
} from '../../../../../lib/meta-callback-result.js';

test('Meta OAuth callback converts provider denial details to a fixed public reason', () => {
    assert.equal(getMetaProviderDenialReason('access_denied: private provider detail'), 'provider_denied');
    assert.equal(getMetaProviderDenialReason(null), null);
});

test('Meta OAuth callback converts unexpected failures to a fixed public reason', () => {
    const providerError = new Error('private Graph API response');
    const publicReason = getMetaCallbackFailureReason(providerError);

    assert.equal(publicReason, 'callback_failed');
    assert.doesNotMatch(publicReason, /private|graph/i);
});
