import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    normalizeDashboardNotices,
    type DashboardNotice
} from './dashboardNotices.js';

test('normalizeDashboardNotices returns an empty list for API error objects', () => {
    const notices = normalizeDashboardNotices({ error: 'Internal server error' });

    assert.deepEqual(notices, []);
});

test('normalizeDashboardNotices keeps valid notice arrays', () => {
    const source = [
        {
            id: 'notice-1',
            title: '공지',
            createdAt: '2026. 06. 17.',
            type: 'team',
            isPinned: true
        }
    ] satisfies readonly DashboardNotice[];

    assert.deepEqual(normalizeDashboardNotices(source), source);
});
