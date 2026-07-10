import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    formatProfilePhoneInput,
    isValidProfileEmail,
    isValidProfilePhone,
    normalizeProfileEmail,
    normalizeProfilePhone
} from './profile-contact.js';

test('normalizeProfileEmail trims and lowercases email addresses', () => {
    assert.equal(normalizeProfileEmail(' User@Example.COM '), 'user@example.com');
});

test('isValidProfileEmail accepts normal addresses and rejects malformed values', () => {
    assert.equal(isValidProfileEmail('manager@example.com'), true);
    assert.equal(isValidProfileEmail('manager-example.com'), false);
    assert.equal(isValidProfileEmail('manager@'), false);
});

test('formatProfilePhoneInput formats registered mobile phone numbers while typing', () => {
    assert.equal(formatProfilePhoneInput('01012345678'), '010-1234-5678');
    assert.equal(formatProfilePhoneInput('010 123 4567'), '010-123-4567');
    assert.equal(formatProfilePhoneInput('010-9999-888899'), '010-9999-8888');
});

test('profile phone validation uses normalized digits', () => {
    assert.equal(normalizeProfilePhone('010-1234-5678'), '01012345678');
    assert.equal(isValidProfilePhone('010-1234-5678'), true);
    assert.equal(isValidProfilePhone('010-123-456'), false);
});
