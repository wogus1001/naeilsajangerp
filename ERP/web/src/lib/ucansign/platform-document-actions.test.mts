import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    platformDocumentCancellationEndpoint,
    platformDocumentViewEndpoint
} from './platform-document-actions.js';

test('Given a UCanSign document id When building view embedding endpoint Then the id is encoded', () => {
    assert.equal(
        platformDocumentViewEndpoint('document id/1'),
        '/embedding/view/document%20id%2F1'
    );
});

test('Given a UCanSign document id When building cancellation endpoint Then the id is encoded', () => {
    assert.equal(
        platformDocumentCancellationEndpoint('2068871675408027649'),
        '/documents/2068871675408027649/request/cancellation'
    );
});
