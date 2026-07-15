import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildScheduleDashboard, scheduleEventHref } from './schedule-dashboard.js';

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

test('Given legacy franchise-operation rows When building the store-development dashboard Then they are excluded', () => {
    const dashboard = buildScheduleDashboard([
        {
            id: 'legacy-sv-1',
            title: '과거 SV 방문',
            date: '2026-07-15',
            sourceType: 'supervision-visit'
        },
        {
            id: 'store-development-1',
            title: '점포 답사',
            date: '2026-07-15',
            sourceType: 'manual'
        }
    ], new Date(2026, 6, 15, 9));

    assert.deepEqual(dashboard.today.map(event => event.id), ['store-development-1']);
});
