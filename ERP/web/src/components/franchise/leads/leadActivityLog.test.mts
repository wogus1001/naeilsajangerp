import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    addLeadActivityLogEntry,
    removeLeadActivityLogEntry,
    updateLeadActivityLogEntry
} from './leadActivityLog.js';
import type { LeadActivity } from './types.js';

const existingActivity: LeadActivity = {
    id: 'activity-existing',
    type: '전화',
    content: '첫 상담',
    createdAt: '2026-06-11T09:00:00.000Z',
    createdBy: '관리자'
};

test('addLeadActivityLogEntry prepends a new activity', () => {
    const nextActivity: LeadActivity = {
        id: 'activity-next',
        type: '메모',
        content: '자료 요청',
        createdAt: '2026-06-12T09:00:00.000Z',
        createdBy: '관리자'
    };

    assert.deepEqual(addLeadActivityLogEntry([existingActivity], nextActivity), [nextActivity, existingActivity]);
});

test('updateLeadActivityLogEntry edits only the matching activity and trims content', () => {
    assert.deepEqual(
        updateLeadActivityLogEntry([existingActivity], 'activity-existing', {
            type: '문자',
            content: '  문자로 정보공개서 문의  '
        }),
        [{
            ...existingActivity,
            type: '문자',
            content: '문자로 정보공개서 문의'
        }]
    );
});

test('removeLeadActivityLogEntry removes only the matching activity', () => {
    const otherActivity: LeadActivity = {
        id: 'activity-other',
        type: '메모',
        content: '방문 가능일 확인',
        createdAt: '2026-06-12T10:00:00.000Z',
        createdBy: '관리자'
    };

    assert.deepEqual(removeLeadActivityLogEntry([otherActivity, existingActivity], 'activity-existing'), [otherActivity]);
});
