import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    formatLeadPhoneInput,
    normalizeLeadDesiredRegionValue,
    parseLeadDesiredRegions
} from './leadFormFormatters.js';

test('formatLeadPhoneInput formats mobile numbers while typing', () => {
    assert.equal(formatLeadPhoneInput('01012345678'), '010-1234-5678');
    assert.equal(formatLeadPhoneInput('010-123-4567'), '010-123-4567');
    assert.equal(formatLeadPhoneInput('010 9999 8888'), '010-9999-8888');
});

test('formatLeadPhoneInput formats Seoul landline numbers', () => {
    assert.equal(formatLeadPhoneInput('0212345678'), '02-1234-5678');
    assert.equal(formatLeadPhoneInput('02-123-4567'), '02-123-4567');
});

test('parseLeadDesiredRegions deduplicates selected regions', () => {
    assert.deepEqual(parseLeadDesiredRegions('서울 강남구, 경기 성남시, 서울 강남구'), ['서울 강남구', '경기 성남시']);
    assert.equal(normalizeLeadDesiredRegionValue(' 서울 강남구, , 경기 성남시 '), '서울 강남구, 경기 성남시');
});
