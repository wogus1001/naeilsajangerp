import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('Given a React change event When filters update Then the state updater does not retain the event target', () => {
    const source = readFileSync(new URL('./FranchiseSchedulePage.tsx', import.meta.url), 'utf8');

    assert.doesNotMatch(source, /setFilters\(current =>[^\n]*event\.currentTarget/);
});

test('Given an authenticated mutation When request headers are built Then the Headers instance is not spread into an object', () => {
    const source = readFileSync(new URL('./FranchiseSchedulePage.tsx', import.meta.url), 'utf8');

    assert.doesNotMatch(source, /\.\.\.\(await getApiAuthHeaders\(\)\)/);
    assert.match(source, /getApiAuthHeaders\(\{ 'Content-Type': 'application\/json' \}\)/);
});
