import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAddressSimilarityBadges } from './address-similarity.js';

test('Given same district and road name When comparing addresses Then road badge is returned', () => {
    const badges = getAddressSimilarityBadges('서울 강남구 테헤란로 123', '서울 강남구 테헤란로 456');

    assert.deepEqual(badges, ['도로명 유사']);
});

test('Given same district and dong When comparing lot addresses Then lot badge is returned', () => {
    const badges = getAddressSimilarityBadges('서울 강남구 역삼동 10-1', '서울 강남구 역삼동 20-2');

    assert.deepEqual(badges, ['지번 유사']);
});
