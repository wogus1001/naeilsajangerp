import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    FRANCHISE_SCHEDULES_API_PATH,
    buildFranchiseScheduleViewModel,
    getFranchiseScheduleSourceLabel,
    getFranchiseScheduleMutationPath,
    getMonthDays,
    parseFranchiseScheduleAssignees,
    parseFranchiseScheduleItems,
    parseFranchiseScheduleRequesterProfileId
} from './franchiseScheduleViewModel.js';
import type { FranchiseScheduleFilters, FranchiseScheduleItem } from './franchiseScheduleViewModel.js';

const filters: FranchiseScheduleFilters = { status: 'all', source: 'all', visibility: 'all', assignee: '' };

const rows: readonly FranchiseScheduleItem[] = [
    { id: 'late-1', title: '보고서 보완', date: '2026-07-01', status: '진행중', source: 'supervision-report', visibility: 'shared', assigneeProfileId: 'staff-1', assigneeName: '김SV', managerName: '운영팀', details: '', approvalDocumentId: '', completedAt: '', actionUrl: '/dashboard/franchise-supervision' },
    { id: 'today-1', title: '점주 미팅', date: '2026-07-10', status: '예정', source: 'manual', visibility: 'personal', assigneeProfileId: 'staff-1', assigneeName: '김SV', managerName: '운영팀', details: '', approvalDocumentId: '', completedAt: '', actionUrl: '' },
    { id: 'approval-1', title: '방문 결재', date: '2026-07-12', status: '진행중', source: 'approval-document', visibility: 'shared', assigneeProfileId: 'staff-2', assigneeName: '이SV', managerName: '운영팀', details: '', approvalDocumentId: 'doc-1', completedAt: '', actionUrl: '' }
];

test('Given API contract When reading client endpoint Then only franchise schedule API is used', () => {
    assert.equal(FRANCHISE_SCHEDULES_API_PATH, '/api/franchise-schedules');
    assert.notEqual(FRANCHISE_SCHEDULES_API_PATH, `/api/${'schedules'}`);
});

test('Given delete or complete mutation When building the endpoint Then route action parameters are included', () => {
    assert.equal(
        getFranchiseScheduleMutationPath('DELETE', { id: 'schedule-1' }),
        '/api/franchise-schedules?id=schedule-1'
    );
    assert.equal(
        getFranchiseScheduleMutationPath('PATCH', { action: 'complete', id: 'schedule-1' }),
        '/api/franchise-schedules?action=complete'
    );
    assert.equal(
        getFranchiseScheduleMutationPath('POST', { title: '새 일정' }),
        '/api/franchise-schedules'
    );
});

test('Given raw route payload When parsing Then invalid rows are dropped and source rows are preserved', () => {
    const items = parseFranchiseScheduleItems({
        schedules: [
            { id: 'manual-1', title: '수동 일정', date: '2026-07-10', status: 'scheduled', sourceType: 'manual' },
            { id: 'doc-1', title: '결재 일정', dueDate: '2026-07-11', status: 'in_progress', sourceType: 'approval-document', approvalDocumentId: 'approval-1' },
            { id: '', title: '누락', date: '2026-07-12' }
        ]
    });

    assert.equal(items.length, 2);
    assert.equal(items[0]?.status, '예정');
    assert.equal(items[1]?.source, 'approval-document');
});

test('Given franchise source schedules When parsing Then contract and disclosure sources stay distinct', () => {
    const items = parseFranchiseScheduleItems({
        data: [
            { id: 'vendor-1', title: '업체 계약 갱신', date: '2026-07-20', sourceType: 'vendor-contract-renewal' },
            { id: 'disclosure-1', title: '정보공개서 계약 가능일', date: '2026-07-21', sourceType: 'disclosure-contract-eligible' }
        ]
    });

    assert.deepEqual(items.map(item => item.source), [
        'vendor-contract-renewal',
        'disclosure-contract-eligible'
    ]);
    assert.deepEqual(items.map(item => getFranchiseScheduleSourceLabel(item.source)), [
        '업체 계약',
        '정보공개서'
    ]);
});

test('Given an operational source with a safe action URL When parsing Then its navigation is retained', () => {
    const [item] = parseFranchiseScheduleItems({
        data: [{
            id: 'report-1',
            title: '점검 보고서 검토',
            date: '2026-07-15',
            sourceType: 'supervision-report',
            metadata: { actionUrl: '/dashboard/franchise-supervision' }
        }]
    });

    assert.equal(item?.source, 'supervision-report');
    assert.equal(item?.actionUrl, '/dashboard/franchise-supervision');
});

test('Given an action URL that escapes the dashboard When parsing Then navigation is rejected', () => {
    const [item] = parseFranchiseScheduleItems({
        data: [{
            id: 'report-1',
            title: '점검 보고서 검토',
            date: '2026-07-15',
            sourceType: 'supervision-report',
            metadata: { actionUrl: '/dashboard/../schedule' }
        }]
    });

    assert.equal(item?.actionUrl, '');
});

test('Given the shared API envelope When parsing Then schedule rows are read from data', () => {
    const items = parseFranchiseScheduleItems({
        data: [
            { id: 'manual-1', title: '수동 일정', date: '2026-07-13', status: '예정', sourceType: '' }
        ],
        success: true
    });

    assert.equal(items.length, 1);
    assert.equal(items[0]?.id, 'manual-1');
    assert.equal(items[0]?.visibility, 'shared');
});

test('Given personal schedules When filtering Then only the requested visibility is shown', () => {
    const model = buildFranchiseScheduleViewModel({
        items: rows,
        filters: { ...filters, visibility: 'personal' },
        selectedDate: '2026-07-10',
        monthDate: new Date('2026-07-01T00:00:00'),
        state: 'ready',
        today: '2026-07-10'
    });

    assert.deepEqual(model.filteredItems.map(item => item.id), ['today-1']);
});

test('Given company profile rows When parsing assignees Then only named profile options are returned', () => {
    const assignees = parseFranchiseScheduleAssignees({
        data: [
            { id: 'staff-1', name: '김담당' },
            { id: 'staff-2', name: '  ' },
            { id: '', name: '누락' }
        ]
    });

    assert.deepEqual(assignees, [{ id: 'staff-1', name: '김담당' }]);
});

test('Given assignee metadata When parsing Then the signed-in profile is retained', () => {
    const payload = { data: { assignees: [{ id: 'staff-1', name: '김담당' }], requesterProfileId: 'staff-1' } };

    assert.deepEqual(parseFranchiseScheduleAssignees(payload), [{ id: 'staff-1', name: '김담당' }]);
    assert.equal(parseFranchiseScheduleRequesterProfileId(payload), 'staff-1');
});

test('Given schedule rows When building view model Then approval work stays out of the franchise calendar', () => {
    const model = buildFranchiseScheduleViewModel({
        items: rows,
        filters,
        selectedDate: '2026-07-10',
        monthDate: new Date('2026-07-01T00:00:00'),
        state: 'ready',
        today: '2026-07-10'
    });

    assert.deepEqual(model.kpis.map(kpi => kpi.label), ['오늘 일정', '진행 중', '지연 일정', '이번 주']);
    assert.equal(model.kpis.find(kpi => kpi.label === '이번 주')?.helper, '향후 7일 예정 일정');
    assert.equal(model.kpis.find(kpi => kpi.label === '오늘 일정')?.value, 1);
    assert.equal(model.kpis.find(kpi => kpi.label === '진행 중')?.value, 1);
    assert.equal(model.kpis.find(kpi => kpi.label === '지연 일정')?.value, 1);
    assert.equal(model.filteredItems.some(item => item.source === 'approval-document'), false);
});

test('Given response states When building view model Then empty, sql, forbidden and loading states stay defined', () => {
    for (const state of ['loading', 'needs-sql', 'forbidden', 'error'] as const) {
        const model = buildFranchiseScheduleViewModel({
            items: [],
            filters,
            selectedDate: '2026-07-10',
            monthDate: new Date('2026-07-01T00:00:00'),
            state
        });
        assert.equal(model.state, state);
    }

    const empty = buildFranchiseScheduleViewModel({
        items: [],
        filters,
        selectedDate: '2026-07-10',
        monthDate: new Date('2026-07-01T00:00:00'),
        state: 'ready'
    });
    assert.equal(empty.state, 'empty');
});

test('Given month date When creating grid Then calendar has stable six week layout', () => {
    const days = getMonthDays(new Date('2026-07-01T00:00:00'));

    assert.equal(days.length, 42);
    assert.equal(days[0], '2026-06-28');
    assert.equal(days[41], '2026-08-08');
});
