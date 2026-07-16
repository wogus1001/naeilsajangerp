import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchAllWorkIntakeRows } from './work-intake-batch.js';

test('Given more rows than one database page When loading work intake rows Then no older row is lost', async () => {
    const source = Array.from({ length: 2_005 }, (_, index) => index + 1);
    const rows = await fetchAllWorkIntakeRows(async (from, to) => source.slice(from, to + 1));

    assert.equal(rows.length, 2_005);
    assert.equal(rows.at(-1), 2_005);
});
