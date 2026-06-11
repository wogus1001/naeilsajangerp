import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    DEFAULT_LEAD_TABLE_COLUMN_KEYS,
    normalizeLeadTableColumnKeys,
    toggleLeadTableColumn
} from './leadTableConfig.js';

test('normalizeLeadTableColumnKeys keeps valid configured columns in table order', () => {
    assert.deepEqual(
        normalizeLeadTableColumnKeys(['memo', 'unknown', 'name', 'budget']),
        ['name', 'budget', 'memo']
    );
});

test('normalizeLeadTableColumnKeys falls back to defaults when no valid columns remain', () => {
    assert.deepEqual(normalizeLeadTableColumnKeys(['unknown']), DEFAULT_LEAD_TABLE_COLUMN_KEYS);
});

test('toggleLeadTableColumn prevents hiding the required name column', () => {
    assert.deepEqual(toggleLeadTableColumn(['name', 'mobile'], 'name'), ['name', 'mobile']);
    assert.deepEqual(toggleLeadTableColumn(['name', 'mobile'], 'memo'), ['name', 'mobile', 'memo']);
});
