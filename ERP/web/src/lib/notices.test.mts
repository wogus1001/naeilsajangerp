import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
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
