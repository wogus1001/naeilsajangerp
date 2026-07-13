import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('Given the store-development schedule header When rendered Then no redundant schedule tabs are exposed', () => {
    const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

    assert.doesNotMatch(source, /전사 업무·결재/);
    assert.doesNotMatch(source, /점포개발 일정/);
    assert.doesNotMatch(source, /styles\.scheduleTabs/);
});
