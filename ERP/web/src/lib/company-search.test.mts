import assert from 'node:assert/strict';
import test from 'node:test';
import { doesCompanyNameMatchQuery } from './company-search.js';

test('Given mixed-case company name When searching lowercase first letter Then it matches', () => {
    assert.equal(doesCompanyNameMatchQuery('Platinum Partners', 'p'), true);
});

test('Given spaced company name When searching without spaces Then it matches', () => {
    assert.equal(doesCompanyNameMatchQuery('Platinum Partners', 'platinumpartners'), true);
});

test('Given unrelated query When matching company name Then it does not match', () => {
    assert.equal(doesCompanyNameMatchQuery('Platinum Partners', 'gold'), false);
});
