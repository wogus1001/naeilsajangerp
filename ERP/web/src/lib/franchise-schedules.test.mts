import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import type * as FranchiseSchedules from './franchise-schedules.js';

const loadFranchiseSchedules: (path: string) => typeof FranchiseSchedules = createRequire(import.meta.url);
const franchiseSchedulesSourcePath = './franchise-schedules.t' + 's';
const {
    canEditFranchiseScheduleSource,
    classifyFranchiseSchedule,
    dateKeyFromFranchiseScheduleValue,
    kstDateKey,
    normalizeFranchiseScheduleStatus,
    sourceBadgeForFranchiseSchedule,
    validateFranchiseScheduleInput
} = loadFranchiseSchedules(franchiseSchedulesSourcePath);

void test('Given UTC timestamps around midnight When deriving keys Then KST date is used', () => {
    assert.equal(kstDateKey(new Date('2026-07-09T14:59:59.000Z')), '2026-07-09');
    assert.equal(kstDateKey(new Date('2026-07-09T15:00:00.000Z')), '2026-07-10');
    assert.equal(dateKeyFromFranchiseScheduleValue('2026-07-09T15:00:00.000Z'), '2026-07-10');
});

void test('Given legacy and Korean statuses When normalizing Then only supported statuses are accepted', () => {
    assert.equal(normalizeFranchiseScheduleStatus('scheduled'), '예정');
    assert.equal(normalizeFranchiseScheduleStatus('승인대기'), '진행중');
    assert.equal(normalizeFranchiseScheduleStatus('completed'), '완료');
    assert.equal(normalizeFranchiseScheduleStatus('unsupported'), null);
});

void test('Given terminal overdue schedules When classifying Then they are not overdue', () => {
    const now = new Date('2026-07-10T03:00:00.000Z');

    assert.equal(classifyFranchiseSchedule({ date: '2026-07-09', status: '완료', source: null, now }).isOverdue, false);
    assert.equal(classifyFranchiseSchedule({ date: '2026-07-09', status: '취소', source: null, now }).isOverdue, false);
    assert.equal(classifyFranchiseSchedule({ date: '2026-07-09', status: '진행중', source: null, now }).isOverdue, true);
});

void test('Given approval and manual schedules When classifying Then approval queue and badges are explicit', () => {
    const source = { sourceType: 'approval-document' as const, sourceId: 'doc-1' };
    const classified = classifyFranchiseSchedule({ date: '2026-07-10', status: '진행중', source, now: new Date('2026-07-10T01:00:00.000Z') });

    assert.equal(classified.isToday, true);
    assert.equal(classified.isThisWeek, true);
    assert.equal(classified.needsApproval, true);
    assert.equal(sourceBadgeForFranchiseSchedule(source), '결재');
    assert.equal(sourceBadgeForFranchiseSchedule(null), '수동');
});

void test('Given manual and source schedules When checking mutation rules Then only manual rows are editable', () => {
    assert.equal(canEditFranchiseScheduleSource(null), true);
    assert.equal(canEditFranchiseScheduleSource({ sourceType: 'supervision-visit', sourceId: 'visit-1' }), false);
});

void test('Given invalid inputs When validating Then typed failures are returned without throwing', () => {
    assert.deepEqual(validateFranchiseScheduleInput({ title: ' ', date: '2026-07-10' }), {
        ok: false,
        reason: 'invalid_title',
        message: 'Title is required.'
    });
    assert.equal(validateFranchiseScheduleInput({ title: '방문', date: 'not-a-date' }).ok, false);
    assert.equal(validateFranchiseScheduleInput({ title: '방문', date: '2026-07-10', status: 'mystery' }).ok, false);
    assert.equal(validateFranchiseScheduleInput({ title: '방문', date: '2026-07-10', sourceType: 'approval-document' }).ok, false);
});

void test('Given valid source input When validating Then normalized readonly contract is returned', () => {
    assert.deepEqual(validateFranchiseScheduleInput({
        title: '  결재 확인  ',
        dueAt: '2026-07-10T00:00:00.000Z',
        status: 'pending',
        sourceType: 'approval-document',
        sourceId: 'doc-1'
    }), {
        ok: true,
        value: {
            title: '결재 확인',
            date: '2026-07-10',
            status: '예정',
            source: { sourceType: 'approval-document', sourceId: 'doc-1' }
        }
    });
});
