import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./FranchiseBrandSelector.tsx', import.meta.url), 'utf8');

test('Given no brand search source When searching Then the production saved, cache, and disclosure endpoints remain available', () => {
    assert.match(source, /\/api\/franchise-brands/);
    assert.match(source, /\/api\/franchise\?query=/);
    assert.match(source, /includeDisclosure/);
});

test('Given an injected brand search source When searching Then the shared selector delegates to its typed source', () => {
    assert.match(source, /export type FranchiseBrandSearchSource/);
    assert.match(source, /searchSource\??:/);
    assert.match(source, /searchSource\.search/);
});
