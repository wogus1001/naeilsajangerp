import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractBearerToken } from './api-auth.js';

test('extractBearerToken reads the bearer authorization token first', () => {
    const request = new Request('https://example.test/api', {
        headers: {
            Authorization: 'Bearer session-token',
            'x-access-token': 'fallback-token'
        }
    });

    assert.equal(extractBearerToken(request), 'session-token');
});

test('extractBearerToken falls back to x-access-token', () => {
    const request = new Request('https://example.test/api', {
        headers: {
            'x-access-token': 'fallback-token'
        }
    });

    assert.equal(extractBearerToken(request), 'fallback-token');
});
