import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./AlertModal.tsx', import.meta.url), 'utf8');

test('Given an open alert modal When shown Then it is keyboard accessible', () => {
    assert.match(source, /role="alertdialog"/);
    assert.match(source, /aria-modal="true"/);
    assert.match(source, /closeButtonRef\.current\?\.focus\(\)/);
    assert.match(source, /event\.key === 'Escape'/);
    assert.match(source, /previouslyFocused\?\.focus\(\)/);
    assert.match(source, /bg-green-700/);
});
