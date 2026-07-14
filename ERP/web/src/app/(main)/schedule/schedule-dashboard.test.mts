import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scheduleEventHref } from './schedule-dashboard.js';

test('Given a linked approval schedule When opening it Then the approval document route is returned', () => {
    assert.equal(scheduleEventHref({
        id: 'schedule-1',
        title: '결재 검토',
        date: '2026-07-14',
        sourceType: 'approval-document',
        sourceId: 'document/1'
    }), '/approvals/documents/document%2F1');
});

test('Given a regular schedule When opening it Then no workflow route is returned', () => {
    assert.equal(scheduleEventHref({
        id: 'schedule-2',
        title: '현장 방문',
        date: '2026-07-14',
        sourceType: 'supervision-visit',
        sourceId: 'visit-1'
    }), '');
});
