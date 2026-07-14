import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missingWorkIntakeEditFields } from './work-intake-edit-validation.js';

test('Given an empty property edit When validating Then all required lease fields are reported', () => {
    assert.deepEqual(missingWorkIntakeEditFields('properties', {}), ['업종', '물건 주소', '보증금', '월세']);
});

test('Given a complete matching request edit When validating Then no required field is reported', () => {
    assert.deepEqual(missingWorkIntakeEditFields('matchingRequests', {
        desiredCategory: '카페',
        desiredRegion: '서울',
        mobile: '010-1234-5678',
        name: '홍길동',
        ownedPropertyStatus: '미보유',
        totalBudget: '10,000'
    }), []);
});

test('Given whitespace for a required lead name When validating Then it is treated as missing', () => {
    assert.deepEqual(missingWorkIntakeEditFields('leadRegistrations', { name: '  ' }), ['가맹 희망자명']);
});
