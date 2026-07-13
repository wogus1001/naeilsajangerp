import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missingRequiredApprovalFields } from './submission.js';

void test('Given required template fields When submitted values are blank Then their labels are returned', () => {
    const missing = missingRequiredApprovalFields([
        { key: 'title', label: '업무 제목', required: true, type: 'text' },
        { key: 'period', label: '업무 기간', required: true, type: 'period' },
        { key: 'note', label: '안내', required: true, type: 'description' }
    ], { title: '  ', period: { start: '', end: '' } });

    assert.deepEqual(missing, ['업무 제목', '업무 기간']);
});

void test('Given required structured fields When at least one value exists Then submission is accepted', () => {
    const missing = missingRequiredApprovalFields([
        { key: 'period', label: '업무 기간', required: true, type: 'period' },
        { key: 'items', label: '내역', required: true, type: 'table' }
    ], { period: { start: '2026-07-13', end: '' }, items: [{ name: '점검' }] });

    assert.deepEqual(missing, []);
});
