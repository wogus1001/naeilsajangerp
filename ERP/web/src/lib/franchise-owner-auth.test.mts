import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    createOwnerSessionToken,
    hashOwnerPassword,
    hashOwnerSessionToken,
    normalizeOwnerLoginId,
    verifyOwnerPassword
} from './franchise-owner-auth.js';

void test('Given mixed owner login id When normalizing Then lower-case trimmed id is returned', () => {
    assert.equal(normalizeOwnerLoginId('  Owner-Store01  '), 'owner-store01');
});

void test('Given owner password When hashing Then valid password verifies and invalid password fails', async () => {
    const passwordHash = await hashOwnerPassword('temporary-1234');

    assert.match(passwordHash, /^scrypt:/);
    assert.equal(await verifyOwnerPassword('temporary-1234', passwordHash), true);
    assert.equal(await verifyOwnerPassword('temporary-0000', passwordHash), false);
    assert.equal(await verifyOwnerPassword('temporary-1234', 'plain-text'), false);
});

void test('Given owner session token When hashing Then hash is deterministic and token is not stored directly', () => {
    const token = createOwnerSessionToken();
    const firstHash = hashOwnerSessionToken(token);
    const secondHash = hashOwnerSessionToken(token);

    assert.equal(firstHash, secondHash);
    assert.notEqual(firstHash, token);
    assert.equal(firstHash.length, 64);
});
