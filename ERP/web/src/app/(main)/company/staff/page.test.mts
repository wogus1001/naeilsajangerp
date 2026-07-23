import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

test('Given a pending signup request When rendering the approval row Then the internal user id is not displayed', () => {
    const pendingSection = source
        .split('{/* 1. Pending Approval */}')[1]
        ?.split('{/* 2. Managers */}')[0] ?? '';

    assert.match(pendingSection, /handleAction\(staff\.id, 'approve'\)/);
    assert.doesNotMatch(pendingSection, /\(\{staff\.id\}\)/);
});
