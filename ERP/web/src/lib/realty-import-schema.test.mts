import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildExternalListingScopePayload,
    canPersistRequesterScopedListing
} from './realty-import-schema.js';

test('buildExternalListingScopePayload omits requester_id when the listing schema does not support it', () => {
    const payload = buildExternalListingScopePayload({
        companyId: 'company-1',
        requesterId: 'requester-1',
        supportsRequesterId: false
    });

    assert.deepEqual(payload, {
        company_id: 'company-1'
    });
});

test('buildExternalListingScopePayload includes requester_id when the listing schema supports it', () => {
    const payload = buildExternalListingScopePayload({
        companyId: 'company-1',
        requesterId: 'requester-1',
        supportsRequesterId: true
    });

    assert.deepEqual(payload, {
        company_id: 'company-1',
        requester_id: 'requester-1'
    });
});

test('canPersistRequesterScopedListing requires requester_id support only without company scope', () => {
    assert.equal(canPersistRequesterScopedListing('company-1', false), true);
    assert.equal(canPersistRequesterScopedListing(null, false), false);
    assert.equal(canPersistRequesterScopedListing(null, true), true);
});
