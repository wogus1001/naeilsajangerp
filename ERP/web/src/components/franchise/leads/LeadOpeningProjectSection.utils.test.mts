import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    patchOpeningProjectTask,
    readOpeningProjectStatus,
    toOpeningProjectDraft
} from './LeadOpeningProjectSection.utils.js';

test('Given a contract store location without project When building draft Then default opening tasks are attached', () => {
    const draft = toOpeningProjectDraft({
        id: 'location-1',
        name: '내일 강남점',
        status: '오픈준비',
        region: '서울 강남구',
        openedAt: '2026-07-10'
    });

    assert.equal(draft.locationId, 'location-1');
    assert.equal(draft.status, '준비중');
    assert.equal(draft.targetOpenDate, '2026-07-10');
    assert.deepEqual(draft.tasks.map(task => task.label), ['계약', '인테리어', '교육', '초도물류', '홍보', '오픈일']);
});

test('Given an existing project When building draft Then saved state wins over location defaults', () => {
    const draft = toOpeningProjectDraft(
        {
            id: 'location-1',
            name: '내일 강남점',
            status: '오픈준비',
            openedAt: '2026-07-10'
        },
        {
            id: 'project-1',
            companyId: 'company-1',
            locationId: 'location-1',
            managerId: null,
            status: '진행중',
            targetOpenDate: '2026-07-20',
            memo: '간판 일정 확인',
            summary: { total: 1, done: 1, blocked: 0, overdue: 0, dueSoon: 0, progressPercent: 100 },
            tasks: [{ id: 'contract', label: '계약서 확인', status: '완료', owner: '', dueDate: '', memo: '' }]
        }
    );

    assert.equal(draft.id, 'project-1');
    assert.equal(draft.status, '진행중');
    assert.equal(draft.targetOpenDate, '2026-07-20');
    assert.equal(draft.memo, '간판 일정 확인');
    assert.equal(draft.tasks[0]?.status, '완료');
});

test('Given a checklist task patch When updating draft tasks Then only the target task changes', () => {
    const draft = toOpeningProjectDraft({
        id: 'location-1',
        name: '내일 강남점',
        status: '오픈준비'
    });

    const nextTasks = patchOpeningProjectTask(draft.tasks, 'training', { status: '막힘', memo: '담당자 일정 미확정' });

    assert.equal(draft.tasks.find(task => task.id === 'training')?.status, '대기');
    assert.equal(nextTasks.find(task => task.id === 'training')?.status, '막힘');
    assert.equal(nextTasks.find(task => task.id === 'training')?.memo, '담당자 일정 미확정');
});

test('Given unknown project status text When reading status Then preparing is used', () => {
    assert.equal(readOpeningProjectStatus('알수없음'), '준비중');
});
