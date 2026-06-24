import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildDefaultOpeningProjectTasks,
    groupOpeningProjectTasks,
    mergeOpeningProjectTasks,
    normalizeOpeningProjectStatus,
    normalizeOpeningProjectTaskStatus,
    summarizeOpeningProjectTasks,
    updateOpeningProjectTask
} from './franchise-opening-projects.js';

test('buildDefaultOpeningProjectTasks returns grouped HQ opening checklist items', () => {
    const tasks = buildDefaultOpeningProjectTasks();

    assert.equal(tasks.length, 25);
    assert.deepEqual(tasks.slice(0, 4).map(task => task.label), [
        '계약 최종본 확인',
        '사업자등록증/영업신고증',
        '정산계좌/POS 정보',
        '위생교육/보험 확인'
    ]);
    assert.equal(tasks[0]?.groupId, 'contract-admin');
    assert.equal(tasks[0]?.required, true);
    assert.equal(tasks.every(task => task.status === '대기'), true);
});

test('mergeOpeningProjectTasks preserves saved task state and appends missing default tasks', () => {
    const tasks = mergeOpeningProjectTasks([
        {
            id: 'contract',
            label: '계약',
            status: '완료',
            owner: '김담당',
            dueDate: '2026-06-20',
            memo: '계약서 확인 완료'
        }
    ]);

    assert.equal(tasks.length, 25);
    assert.equal(tasks[0]?.id, 'contract');
    assert.equal(tasks[0]?.label, '계약 최종본 확인');
    assert.equal(tasks[0]?.status, '완료');
    assert.equal(tasks[0]?.owner, '김담당');
    assert.equal(tasks[0]?.dueDate, '2026-06-20');
    assert.equal(tasks[0]?.memo, '계약서 확인 완료');
    assert.equal(tasks[1]?.label, '사업자등록증/영업신고증');
    assert.equal(tasks[1]?.status, '대기');
});

test('updateOpeningProjectTask updates one checklist item without mutating the original list', () => {
    const original = buildDefaultOpeningProjectTasks();
    const updated = updateOpeningProjectTask(original, 'interior', {
        status: '진행중',
        owner: '이SV',
        dueDate: '2026-06-12',
        memo: '실측 예약'
    });
    const originalInterior = original.find(task => task.id === 'interior');
    const updatedInterior = updated.find(task => task.id === 'interior');

    assert.equal(originalInterior?.status, '대기');
    assert.equal(updatedInterior?.status, '진행중');
    assert.equal(updatedInterior?.owner, '이SV');
    assert.equal(updatedInterior?.memo, '실측 예약');
});

test('summarizeOpeningProjectTasks counts progress, blockers, overdue, and due-soon tasks', () => {
    const tasks = mergeOpeningProjectTasks([
        { id: 'contract', label: '계약', status: '완료', dueDate: '2026-06-01' },
        { id: 'interior', label: '인테리어', status: '막힘', dueDate: '2026-06-09' },
        { id: 'training', label: '교육', status: '진행중', dueDate: '2026-06-10' },
        { id: 'initial-stock', label: '초도물류', status: '확인요청', dueDate: '2026-06-13' }
    ]);

    const summary = summarizeOpeningProjectTasks(tasks, new Date('2026-06-10T12:00:00+09:00'));

    assert.equal(summary.total, 25);
    assert.equal(summary.done, 1);
    assert.equal(summary.blocked, 1);
    assert.equal(summary.reviewRequested, 1);
    assert.equal(summary.dueToday, 1);
    assert.equal(summary.overdue, 1);
    assert.equal(summary.dueSoon, 1);
    assert.equal(summary.progressPercent, 4);
});

test('groupOpeningProjectTasks returns stage summaries without losing saved status', () => {
    const groups = groupOpeningProjectTasks([
        { id: 'contract', status: '완료' },
        { id: 'business-registration', status: '확인요청' },
        { id: 'interior', status: '진행중' }
    ]);

    assert.deepEqual(groups.map(group => group.label), ['계약/행정', '인테리어', '교육', '초도물류', '홍보', '오픈일']);
    assert.deepEqual(groups[0]?.summary, {
        total: 4,
        done: 1,
        blocked: 0,
        reviewRequested: 1,
        dueToday: 0,
        overdue: 0,
        dueSoon: 0,
        progressPercent: 25
    });
    assert.equal(groups[1]?.tasks[0]?.status, '진행중');
});

test('normalizeOpeningProjectStatus falls back to preparing for unknown status text', () => {
    assert.equal(normalizeOpeningProjectStatus('완료됨'), '완료');
    assert.equal(normalizeOpeningProjectStatus('알 수 없음'), '준비중');
});

test('normalizeOpeningProjectTaskStatus accepts confirmation request labels', () => {
    assert.equal(normalizeOpeningProjectTaskStatus('확인 필요'), '확인요청');
    assert.equal(normalizeOpeningProjectTaskStatus('점주 요청'), '확인요청');
    assert.equal(normalizeOpeningProjectTaskStatus('이슈'), '막힘');
});
