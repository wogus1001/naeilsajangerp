import assert from 'node:assert/strict';
import { test } from 'node:test';
import { platformDocumentCancellationEndpoint } from './platform-document-actions.js';

test('Given a UCanSign document id When building cancellation endpoint Then the id is encoded', () => {
    assert.equal(
        platformDocumentCancellationEndpoint('2068871675408027649'),
        '/documents/2068871675408027649/request/cancellation'
    );
});
