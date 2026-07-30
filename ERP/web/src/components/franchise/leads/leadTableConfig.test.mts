import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    DEFAULT_LEAD_TABLE_COLUMN_KEYS,
    LEAD_TABLE_CHECKBOX_COLUMN_WIDTH,
    LEAD_TABLE_COLUMN_WIDTHS,
    LEAD_TABLE_SORT_OPTIONS,
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

test('default lead table uses a compact desktop width without squeezing row actions', () => {
    const defaultTableWidth = LEAD_TABLE_CHECKBOX_COLUMN_WIDTH
        + DEFAULT_LEAD_TABLE_COLUMN_KEYS.reduce(
            (sum, columnKey) => sum + LEAD_TABLE_COLUMN_WIDTHS[columnKey],
            0
        );

    assert.ok(defaultTableWidth <= 1400);
    assert.ok(LEAD_TABLE_COLUMN_WIDTHS.actions >= 176);
});

test('lead table columns follow the shared 8px spacing rhythm', () => {
    assert.equal(LEAD_TABLE_CHECKBOX_COLUMN_WIDTH % 8, 0);

    for (const columnWidth of Object.values(LEAD_TABLE_COLUMN_WIDTHS)) {
        assert.equal(columnWidth % 8, 0);
    }
});

test('lead table exposes only the supported sort workflow in display order', () => {
    assert.deepEqual(
        LEAD_TABLE_SORT_OPTIONS.map(option => option.key),
        [
            'created_desc',
            'created_asc',
            'budget_asc',
            'budget_desc',
            'priority_only',
            'disclosure_recent',
            'disclosure_eligible'
        ]
    );
});
