import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    DEFAULT_LEAD_RANGE,
    readLeadRangePreference,
    writeLeadRangePreference
} from './leadRangePreference.js';

function createMemoryStorage(initialValue: string | null = null) {
    let value = initialValue;
    return {
        getItem: () => value,
        setItem: (_key: string, nextValue: string) => {
            value = nextValue;
        }
    };
}

test('Given no saved range, When the preference is read, Then the default is 전체', () => {
    const storage = createMemoryStorage();

    assert.equal(readLeadRangePreference(storage), DEFAULT_LEAD_RANGE);
    assert.equal(DEFAULT_LEAD_RANGE, '전체');
});

test('Given a saved quick range, When the preference is read, Then the last selection is restored', () => {
    const storage = createMemoryStorage('최근 30일');

    assert.equal(readLeadRangePreference(storage), '최근 30일');
});

test('Given an invalid saved value, When the preference is read, Then it safely falls back to 전체', () => {
    const storage = createMemoryStorage('잘못된 기간');

    assert.equal(readLeadRangePreference(storage), '전체');
});

test('Given range buttons are clicked, When preferences are written, Then the latest click wins', () => {
    const storage = createMemoryStorage();

    writeLeadRangePreference(storage, '최근 7일');
    writeLeadRangePreference(storage, '전체');

    assert.equal(readLeadRangePreference(storage), '전체');
});
