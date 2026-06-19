import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAmount, normalizeAmountInput, numberToKoreanCurrency } from './money.js';

test('Given formatted amount text When normalizing Then only digits are used', () => {
    assert.equal(normalizeAmountInput('12,345,000원'), 12345000);
    assert.equal(formatAmount('12345000'), '12,345,000');
});

test('Given amount When converting to Korean currency Then text field is separated from numeric field', () => {
    assert.equal(numberToKoreanCurrency('5000000'), '오백만원');
    assert.equal(numberToKoreanCurrency('0'), '영원');
});
