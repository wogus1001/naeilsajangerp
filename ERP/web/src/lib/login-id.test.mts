import test from 'node:test';
import assert from 'node:assert/strict';
import { getEmailLocalLoginId, isValidLoginId, normalizeLoginId } from './login-id';

test('normalizeLoginId trims and lowercases', () => {
    assert.equal(normalizeLoginId('  Kim_JH-01  '), 'kim_jh-01');
});

test('isValidLoginId allows only company-scoped login id characters', () => {
    assert.equal(isValidLoginId('kim.jh_01'), true);
    assert.equal(isValidLoginId('ab'), false);
    assert.equal(isValidLoginId('kim@company.com'), false);
    assert.equal(isValidLoginId('한글아이디'), false);
});

test('getEmailLocalLoginId returns the local email part', () => {
    assert.equal(getEmailLocalLoginId('Admin@Example.com'), 'admin');
    assert.equal(getEmailLocalLoginId('plain-id'), 'plain-id');
});
