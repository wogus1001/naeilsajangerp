import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatManagerDisplayName, formatManagerOptionLabel } from './franchise-manager-display.js';

test('formatManagerDisplayName prefixes partner vendors with 협력업체', () => {
    assert.equal(
        formatManagerDisplayName({ id: 'user-1', name: '김재현', role: 'partner_vendor' }),
        '협력업체-김재현'
    );
});

test('formatManagerOptionLabel keeps internal employee labels unchanged and appends company for admins', () => {
    assert.equal(formatManagerDisplayName({ id: 'user-2', name: '김팀장', role: 'manager' }), '김팀장');
    assert.equal(
        formatManagerOptionLabel({ id: 'user-2', name: '김팀장', role: 'manager', companyName: '민티아' }, true),
        '김팀장 · 민티아'
    );
});
