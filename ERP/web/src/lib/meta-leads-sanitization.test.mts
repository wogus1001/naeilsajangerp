import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    sanitizeMetaConnection,
    sanitizeMetaForm,
    sanitizeMetaImport
} from './meta-leads.js';

test('Meta integration API replaces provider errors with stable operational codes', () => {
    // Given
    const connection = {
        id: 'connection-1',
        last_error: '(#200) Permissions error',
        data: { subscribeError: 'Unsupported post request' }
    };
    const form = { id: 'form-1', last_error: 'Graph API request failed' };
    const importLog = { id: 'import-1', error_message: 'Default manager is missing' };

    // When
    const safeConnection = sanitizeMetaConnection(connection);
    const safeForm = sanitizeMetaForm(form);
    const safeImport = sanitizeMetaImport(importLog);

    // Then
    assert.equal(safeConnection?.lastError, 'META_CONNECTION_REAUTH_REQUIRED');
    assert.equal(safeConnection?.subscribeError, 'META_PAGE_SUBSCRIPTION_FAILED');
    assert.equal(safeForm?.lastError, 'META_FORM_SYNC_FAILED');
    assert.equal(safeImport?.errorMessage, 'META_DEFAULT_MANAGER_REQUIRED');
});

test('Meta integration API preserves known issue codes and removes blank provider errors', () => {
    const issueCodes = [
        'META_CONNECTION_REAUTH_REQUIRED',
        'META_PAGE_SUBSCRIPTION_FAILED',
        'META_FORM_SYNC_FAILED',
        'META_DEFAULT_MANAGER_REQUIRED',
        'META_LEAD_FIELDS_REQUIRED',
        'META_LEAD_IMPORT_FAILED'
    ];

    issueCodes.forEach(code => {
        assert.equal(sanitizeMetaConnection({ last_error: code })?.lastError, code);
        assert.equal(sanitizeMetaImport({ error_message: code })?.errorMessage, code);
    });
    assert.equal(sanitizeMetaConnection({ last_error: '  ' })?.lastError, null);
    assert.equal(sanitizeMetaImport({ error_message: null })?.errorMessage, null);
});

test('Meta integration API classifies connection and import failures by the next operator action', () => {
    assert.equal(
        sanitizeMetaConnection({ last_error: 'Webhook subscription failed' })?.lastError,
        'META_PAGE_SUBSCRIPTION_FAILED'
    );
    assert.equal(
        sanitizeMetaConnection({ last_error: 'Lead fetch failed' })?.lastError,
        'META_FORM_SYNC_FAILED'
    );
    assert.equal(
        sanitizeMetaImport({ error_message: 'Name and mobile are missing' })?.errorMessage,
        'META_LEAD_FIELDS_REQUIRED'
    );
    assert.equal(
        sanitizeMetaImport({ error_message: 'Unexpected Graph failure' })?.errorMessage,
        'META_LEAD_IMPORT_FAILED'
    );
});

test('Meta integration API keeps form and subscription empty-state semantics', () => {
    assert.equal(sanitizeMetaForm({ last_error: '' })?.lastError, null);
    assert.equal(sanitizeMetaForm({ last_error: 'Provider error' })?.lastError, 'META_FORM_SYNC_FAILED');
    assert.equal(sanitizeMetaConnection({ data: { subscribeError: '' } })?.subscribeError, '');
    assert.equal(
        sanitizeMetaConnection({ data: { subscribeError: 'Provider error' } })?.subscribeError,
        'META_PAGE_SUBSCRIPTION_FAILED'
    );
});

test('Meta integration API exposes normalized Form questions without provider-only fields', () => {
    const safeForm = sanitizeMetaForm({
        data: {
            questions: [
                {
                    id: 'question-1',
                    key: 'contact_phone',
                    label: '연락처',
                    type: 'PHONE',
                    options: [{ key: 'mobile', value: '휴대폰' }],
                    providerInternalValue: 'hidden'
                }
            ]
        }
    });

    assert.deepEqual(safeForm?.questions, [{
        id: 'question-1',
        key: 'contact_phone',
        label: '연락처',
        type: 'PHONE',
        options: [{ key: 'mobile', label: '휴대폰' }]
    }]);
    assert.equal(Object.hasOwn(safeForm || {}, 'data'), false);
});
