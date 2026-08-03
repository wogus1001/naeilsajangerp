import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./KakaoAddressSearch.tsx', import.meta.url), 'utf8');

test('Given no address lookup source When opening search Then the production Daum postcode implementation remains available', () => {
    assert.match(source, /DaumPostcodeEmbed/);
    assert.match(source, /onComplete=\{selectAddress\}/);
});

test('Given an injected address lookup source When searching Then results are loaded through the typed source and selected by the shared component', () => {
    assert.match(source, /export type KakaoAddressLookupSource/);
    assert.match(source, /lookupSource\??:/);
    assert.match(source, /lookupSource\.search/);
    assert.match(source, /selectLookupAddress/);
});
