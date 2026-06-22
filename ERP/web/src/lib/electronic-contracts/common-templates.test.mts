import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COMMON_ELECTRONIC_CONTRACT_TEMPLATES } from './common-templates.js';

test('Given common electronic templates When listing ids Then each id is unique', () => {
    const ids = COMMON_ELECTRONIC_CONTRACT_TEMPLATES.map(template => template.id);
    const uniqueIds = new Set(ids);

    assert.equal(uniqueIds.size, ids.length);
});

test('Given the premium rights common template When rendering actions Then it opens the contract writer', () => {
    const template = COMMON_ELECTRONIC_CONTRACT_TEMPLATES.find(row => row.id === 'premium-rights-contract');

    assert.equal(template?.name, '권리금계약서');
    assert.equal(template?.href, '/contracts/electronic/create');
});
