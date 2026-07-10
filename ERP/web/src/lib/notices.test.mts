import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    canManageNotice,
    formatNoticeRows,
    parseNoticeLimit,
    type NoticeAuthor,
    type NoticeRow
} from './notices.js';

test('formatNoticeRows formats notices without a Supabase relationship join', () => {
    const rows = [
        {
            id: 'notice-1',
            title: '공지',
            author_id: 'profile-1',
            is_pinned: true,
            created_at: '2026-06-17T00:00:00.000Z'
        }
    ] satisfies readonly NoticeRow[];
    const authors = new Map<string, NoticeAuthor>([
        ['profile-1', { name: '김담당', role: 'manager' }]
    ]);

    const [notice] = formatNoticeRows(rows, authors);

    assert.equal(notice?.authorName, '김담당');
    assert.equal(notice?.authorRole, 'manager');
    assert.equal(notice?.authorId, 'profile-1');
    assert.equal(notice?.isPinned, true);
    assert.match(notice?.createdAt || '', /2026/);
});

test('formatNoticeRows falls back when author lookup is unavailable', () => {
    const rows = [
        {
            id: 'notice-1',
            title: '공지',
            author_id: 'profile-1',
            is_pinned: false,
            created_at: null
        }
    ] satisfies readonly NoticeRow[];

    const [notice] = formatNoticeRows(rows);

    assert.equal(notice?.authorName, '관리자');
    assert.equal(notice?.authorRole, 'admin');
    assert.equal(notice?.createdAt, '');
});

test('parseNoticeLimit caps invalid and oversized limit values', () => {
    assert.equal(parseNoticeLimit(null), null);
    assert.equal(parseNoticeLimit('0'), null);
    assert.equal(parseNoticeLimit('5'), 5);
    assert.equal(parseNoticeLimit('500'), 50);
});

test('canManageNotice allows a notice author identified by profile uid', () => {
    assert.equal(
        canManageNotice(
            { id: 'admin', uid: 'profile-goldasset-manager', role: 'manager', companyId: 'company-goldasset' },
            { authorId: 'profile-goldasset-manager', companyId: 'company-goldasset', type: 'team' }
        ),
        true
    );
});

test('canManageNotice allows same-company managers to repair team notices saved with a legacy author', () => {
    assert.equal(
        canManageNotice(
            { id: 'admin', uid: 'profile-goldasset-manager', role: 'manager', companyId: 'company-goldasset' },
            { authorId: 'legacy-admin-profile', companyId: 'company-goldasset', type: 'team' }
        ),
        true
    );
});

test('canManageNotice blocks staff from managing another author notice', () => {
    assert.equal(
        canManageNotice(
            { id: 'staff', uid: 'profile-staff', role: 'staff', companyId: 'company-goldasset' },
            { authorId: 'profile-goldasset-manager', companyId: 'company-goldasset', type: 'team' }
        ),
        false
    );
});
