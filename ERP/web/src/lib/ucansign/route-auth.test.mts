import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    createUcansignState,
    isMatchingUcansignState,
    normalizeUcansignReturnPath,
    readUcansignReturnPath
} from './route-auth.js';

test('Given a local return path When creating OAuth state Then the callback restores the path', () => {
    const state = createUcansignState('/profile?ucansign=connected#account');

    assert.equal(readUcansignReturnPath(state), '/profile?ucansign=connected#account');
    assert.equal(isMatchingUcansignState(state, state), true);
});

test('Given a forged or missing OAuth state When comparing it Then the request is rejected', () => {
    const expected = createUcansignState('/profile');

    assert.equal(isMatchingUcansignState(`${expected}x`, expected), false);
    assert.equal(isMatchingUcansignState(null, expected), false);
    assert.equal(isMatchingUcansignState(expected, null), false);
});

test('Given an external return URL When normalizing it Then the safe profile path is used', () => {
    assert.equal(normalizeUcansignReturnPath('https://example.com/steal'), '/profile?ucansign=connected');
    assert.equal(normalizeUcansignReturnPath('//example.com/steal'), '/profile?ucansign=connected');
});
