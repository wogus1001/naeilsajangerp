import assert from 'node:assert/strict';
import { test } from 'node:test';
import viewModel from './franchiseScheduleViewModel.js';
import type { FranchiseScheduleItem } from './franchiseScheduleViewModel.js';

const {
    calculateFranchiseScheduleKpis,
    filterFranchiseSchedules,
    isEditableManualSchedule,
    monthGrid,
    paginateFranchiseSchedules,
    schedulesForDay,
    sourceLabelForSchedule
} = viewModel;

const schedules: readonly FranchiseScheduleItem[] = [
    { id: 'manual-today', title: '본사 회의', date: '2026-07-10', status: '예정', createdAt: '2026-07-09T00:00:00.000Z' },
    { id: 'approval', title: 'SV 점검보고 승인', date: '2026-07-11', status: '진행중', sourceType: 'approval-document', sourceId: 'doc-1' },
    { id: 'overdue', title: '계약 갱신 확인', date: '2026-07-08', status: '지연', sourceType: 'manual-workflow', sourceId: 'wf-1' },
    { id: 'done', title: '완료된 일정', date: '2026-07-10', status: '완료' }
];

test('Given franchise schedules When calculating KPI Then today, week, approval and overdue counts are separated', () => {
    const kpis = calculateFranchiseScheduleKpis(schedules, '2026-07-10');

    assert.deepEqual(kpis, { today: 1, week: 3, approval: 1, overdue: 1 });
});

test('Given a filter When listing schedules Then workflow and manual schedules stay distinguishable', () => {
    assert.deepEqual(filterFranchiseSchedules(schedules, 'manual', '2026-07-10').map(item => item.id), ['manual-today', 'done']);
    assert.deepEqual(filterFranchiseSchedules(schedules, 'approval', '2026-07-10').map(item => item.id), ['approval']);
    assert.equal(isEditableManualSchedule(schedules[0]), true);
    assert.equal(isEditableManualSchedule(schedules[1]), false);
    assert.equal(sourceLabelForSchedule(schedules[1]), '결재');
});

test('Given a selected day When reading day schedules Then only that date is sorted by created time', () => {
    const dayItems = schedulesForDay([
        { id: 'late', title: 'B', date: '2026-07-10', status: '예정', createdAt: '2026-07-10T03:00:00.000Z' },
        { id: 'early', title: 'A', date: '2026-07-10', status: '예정', createdAt: '2026-07-10T01:00:00.000Z' },
        { id: 'other', title: 'C', date: '2026-07-11', status: '예정' }
    ], '2026-07-10');

    assert.deepEqual(dayItems.map(item => item.id), ['early', 'late']);
});

test('Given a month key When creating calendar grid Then six weeks are returned', () => {
    const grid = monthGrid('2026-07');

    assert.equal(grid.length, 42);
    assert.equal(grid[0], '2026-06-28');
    assert.equal(grid.at(-1), '2026-08-08');
});

test('Given many schedules When paginating Then the requested page is clamped', () => {
    const result = paginateFranchiseSchedules([1, 2, 3, 4, 5], 3, 2);

    assert.deepEqual(result, { page: 3, pageCount: 3, pageItems: [5] });
});
