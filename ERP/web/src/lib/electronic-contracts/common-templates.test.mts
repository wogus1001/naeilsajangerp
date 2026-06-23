import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COMMON_ELECTRONIC_CONTRACT_TEMPLATES } from './common-templates.js';

test('Given common electronic templates When listing ids Then each id is unique', () => {
    const ids = COMMON_ELECTRONIC_CONTRACT_TEMPLATES.map(template => template.id);
    const uniqueIds = new Set(ids);

    assert.equal(uniqueIds.size, ids.length);
});

test('Given the premium rights common template is incomplete When listing common templates Then it is hidden', () => {
    const isVisible = COMMON_ELECTRONIC_CONTRACT_TEMPLATES.some(row => row.id === 'premium-rights-contract');

    assert.equal(isVisible, false);
});
