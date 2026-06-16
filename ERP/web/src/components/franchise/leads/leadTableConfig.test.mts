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

test('normalizeLeadTableColumnKeys removes legacy contract checklist column from generic lead table', () => {
    assert.deepEqual(
        normalizeLeadTableColumnKeys(['name', 'contractChecklist', 'nextContactAt']),
        ['name', 'nextContactAt']
    );
});

test('normalizeLeadTableColumnKeys keeps disclosure status column in configured order', () => {
    assert.deepEqual(
        normalizeLeadTableColumnKeys(['actions', 'disclosure', 'name']),
        ['name', 'disclosure', 'actions']
    );
});

test('normalizeLeadTableColumnKeys removes hidden customer DB linking column for initial launch', () => {
    assert.deepEqual(
        normalizeLeadTableColumnKeys(['name', 'links', 'actions']),
        ['name', 'actions']
    );
});

test('toggleLeadTableColumn prevents hiding the required name column', () => {
    assert.deepEqual(toggleLeadTableColumn(['name', 'mobile'], 'name'), ['name', 'mobile']);
    assert.deepEqual(toggleLeadTableColumn(['name', 'mobile'], 'memo'), ['name', 'mobile', 'memo']);
});
