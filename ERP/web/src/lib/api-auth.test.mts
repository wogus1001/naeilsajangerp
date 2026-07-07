import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractBearerToken, getRequesterProfile, resolveUserUuid } from './api-auth.js';

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

test('resolveUserUuid does not treat the literal admin id as an admin profile alias', async () => {
    const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: null })
    };
    const supabase = {
        from: () => ({
            ...query,
            ilike: () => {
                throw new Error('admin fallback lookup should not run');
            }
        })
    } as unknown as Parameters<typeof resolveUserUuid>[0];

    assert.equal(await resolveUserUuid(supabase, 'admin'), null);
});

test('getRequesterProfile rejects unsigned requester identity fallbacks', async () => {
    const supabase = {
        from: () => {
            throw new Error('unsigned requester lookups must not query profiles');
        }
    } as unknown as Parameters<typeof getRequesterProfile>[0];
    const request = new Request('https://example.test/api?requesterId=admin');

    assert.equal(await getRequesterProfile(supabase, request), null);
});
