import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildDefaultOpeningProjectTasks,
    mergeOpeningProjectTasks,
    normalizeOpeningProjectStatus,
    summarizeOpeningProjectTasks,
    updateOpeningProjectTask
} from './franchise-opening-projects.js';

test('buildDefaultOpeningProjectTasks returns the six HQ opening checklist items', () => {
    const tasks = buildDefaultOpeningProjectTasks();

    assert.deepEqual(tasks.map(task => task.label), ['계약', '인테리어', '교육', '초도물류', '홍보', '오픈일']);
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

    assert.equal(tasks.length, 6);
    assert.deepEqual(tasks[0], {
        id: 'contract',
        label: '계약',
        status: '완료',
        owner: '김담당',
        dueDate: '2026-06-20',
        memo: '계약서 확인 완료'
    });
    assert.equal(tasks[1]?.label, '인테리어');
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

    assert.equal(original[1]?.status, '대기');
    assert.equal(updated[1]?.status, '진행중');
    assert.equal(updated[1]?.owner, '이SV');
    assert.equal(updated[1]?.memo, '실측 예약');
});

test('summarizeOpeningProjectTasks counts progress, blockers, overdue, and due-soon tasks', () => {
    const tasks = mergeOpeningProjectTasks([
        { id: 'contract', label: '계약', status: '완료', dueDate: '2026-06-01' },
        { id: 'interior', label: '인테리어', status: '막힘', dueDate: '2026-06-09' },
        { id: 'training', label: '교육', status: '진행중', dueDate: '2026-06-13' }
    ]);

    const summary = summarizeOpeningProjectTasks(tasks, new Date('2026-06-10T12:00:00+09:00'));

    assert.deepEqual(summary, {
        total: 6,
        done: 1,
        blocked: 1,
        overdue: 1,
        dueSoon: 1,
        progressPercent: 17
    });
});

test('normalizeOpeningProjectStatus falls back to preparing for unknown status text', () => {
    assert.equal(normalizeOpeningProjectStatus('완료됨'), '완료');
    assert.equal(normalizeOpeningProjectStatus('알 수 없음'), '준비중');
});
