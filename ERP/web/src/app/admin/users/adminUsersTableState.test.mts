import test from 'node:test';
import assert from 'node:assert/strict';
import {
    filterAndSortAdminUsers,
    pageAdminUsers,
    parseAdminUserRoleFilter,
    parseAdminUserStatusFilter
} from './adminUsersTableState.js';
import type { AdminUserRow } from './adminUsersRequests.js';

const users: readonly AdminUserRow[] = [
    {
        uuid: 'uuid-a',
        id: 'alpha@example.com',
        loginId: 'alpha',
        name: '김민준',
        companyName: '내일',
        role: 'manager',
        status: 'active',
        joinedAt: '2026-06-20T00:00:00.000Z'
    },
    {
        uuid: 'uuid-b',
        id: 'beta@example.com',
        loginId: 'beta',
        name: '박서연',
        companyName: '테스트',
        role: 'sub_manager',
        status: 'pending_approval',
        joinedAt: '2026-06-24T00:00:00.000Z'
    },
    {
        uuid: 'uuid-c',
        id: 'gamma@example.com',
        loginId: 'gamma',
        name: '오지훈',
        companyName: '내일',
        role: 'partner_vendor',
        status: 'blocked',
        joinedAt: '2026-06-22T00:00:00.000Z'
    }
];

void test('Given admin users When filtering by pending status Then only approval rows remain', () => {
    const result = filterAndSortAdminUsers(users, {
        query: '',
        status: 'pending_approval',
        role: 'all',
        company: '',
        sortKey: 'joinedAt',
        sortDirection: 'desc'
    });

    assert.deepEqual(result.map(user => user.loginId), ['beta']);
});

void test('Given admin users When searching company and role Then matching rows remain sorted', () => {
    const result = filterAndSortAdminUsers(users, {
        query: '내일',
        status: 'all',
        role: 'all',
        company: '',
        sortKey: 'name',
        sortDirection: 'asc'
    });

    assert.deepEqual(result.map(user => user.name), ['김민준', '오지훈']);
});

void test('Given admin users When filtering company and role Then exact company role rows remain', () => {
    const result = filterAndSortAdminUsers(users, {
        query: '',
        status: 'all',
        role: 'partner_vendor',
        company: '내일',
        sortKey: 'joinedAt',
        sortDirection: 'desc'
    });

    assert.deepEqual(result.map(user => user.loginId), ['gamma']);
});

void test('Given parser input When unknown values arrive Then defaults are safe', () => {
    assert.equal(parseAdminUserStatusFilter('bad-value'), 'all');
    assert.equal(parseAdminUserRoleFilter('bad-value'), 'all');
});

void test('Given users When paging Then requested user slice is returned', () => {
    assert.deepEqual(pageAdminUsers(users, 2, 2).map(user => user.loginId), ['gamma']);
});
