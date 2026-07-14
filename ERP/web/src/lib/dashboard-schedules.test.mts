import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isMissingDashboardScheduleSourceType, selectDashboardUpcomingSchedules } from './dashboard-schedules.js';

void test('Given calendar and approval work When selecting dashboard schedules Then only dated calendar events remain', () => {
    const schedules = selectDashboardUpcomingSchedules([
        {
            id: 'meeting-1',
            date: '2026-07-14',
            time: '10:00:00',
            title: '운영 회의',
            scope: 'company',
            source_type: null
        },
        {
            id: 'approval-1',
            date: '2026-07-14',
            title: '결재 검토: 지출 품의',
            scope: 'company',
            source_type: 'approval-document'
        }
    ], 'profile-1');

    assert.deepEqual(schedules.map(schedule => schedule.id), ['meeting-1']);
});

void test('Given another users personal schedule When selecting dashboard schedules Then it remains private', () => {
    const schedules = selectDashboardUpcomingSchedules([
        {
            id: 'mine',
            date: '2026-07-14',
            title: '내 일정',
            scope: 'personal',
            user_id: 'profile-1'
        },
        {
            id: 'theirs',
            date: '2026-07-14',
            title: '다른 사람 일정',
            scope: 'personal',
            user_id: 'profile-2'
        }
    ], 'profile-1');

    assert.deepEqual(schedules.map(schedule => schedule.id), ['mine']);
});

void test('Given many approval tasks When querying dashboard schedules Then approval rows are filtered before the limit', () => {
    const routeSource = readFileSync(fileURLToPath(new URL('../app/api/dashboard/route.ts', import.meta.url)), 'utf8');
    const sourceFilterIndex = routeSource.indexOf("datedQuery.or('source_type.is.null,source_type.neq.approval-document')");
    const limitIndex = routeSource.indexOf('.limit(20)', sourceFilterIndex);

    assert.ok(sourceFilterIndex >= 0);
    assert.ok(limitIndex > sourceFilterIndex);
});

void test('Given a legacy schedules schema When source type filtering fails Then only the recognized column error uses fallback', () => {
    assert.equal(isMissingDashboardScheduleSourceType({ code: 'PGRST204', message: "Could not find the 'source_type' column" }), true);
    assert.equal(isMissingDashboardScheduleSourceType({ code: '42P01', message: 'schedules does not exist' }), false);
});
