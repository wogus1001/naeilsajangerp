import test from 'node:test';
import assert from 'node:assert/strict';
import {
    filterAndSortUsage,
    pageItems,
    parseUsageFilter,
    parseUsageSortKey
} from './electronicContractUsageTableState.js';
import type { ElectronicContractUsageSummary } from '../../lib/electronic-contracts/usage-summary.js';

const usageRows: readonly ElectronicContractUsageSummary[] = [
    {
        companyId: 'company-a',
        companyName: '내일',
        total: 8,
        draft: 5,
        inProgress: 1,
        completed: 0,
        failed: 1,
        canceled: 1,
        recentSentAt: '2026-06-22T00:00:00.000Z',
        recentCompletedAt: ''
    },
    {
        companyId: 'company-b',
        companyName: '리맥스',
        total: 0,
        draft: 0,
        inProgress: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
        recentSentAt: '',
        recentCompletedAt: ''
    },
    {
        companyId: 'company-c',
        companyName: '테스트',
        total: 3,
        draft: 0,
        inProgress: 0,
        completed: 3,
        failed: 0,
        canceled: 0,
        recentSentAt: '2026-06-21T00:00:00.000Z',
        recentCompletedAt: '2026-06-23T00:00:00.000Z'
    }
];

void test('Given usage rows When filtering failed contracts Then matching companies remain', () => {
    const result = filterAndSortUsage(usageRows, {
        query: '',
        filter: 'failed_or_canceled',
        sortKey: 'companyName',
        sortDirection: 'asc'
    });

    assert.deepEqual(result.map(item => item.companyName), ['내일']);
});

void test('Given usage rows When searching lowercase company id Then company id is matched', () => {
    const result = filterAndSortUsage(usageRows, {
        query: 'company-c',
        filter: 'all',
        sortKey: 'total',
        sortDirection: 'desc'
    });

    assert.deepEqual(result.map(item => item.companyName), ['테스트']);
});

void test('Given usage rows When sorting by total desc Then high usage company comes first', () => {
    const result = filterAndSortUsage(usageRows, {
        query: '',
        filter: 'all',
        sortKey: 'total',
        sortDirection: 'desc'
    });

    assert.deepEqual(result.map(item => item.companyName), ['내일', '테스트', '리맥스']);
});

void test('Given parser input When unknown values arrive Then defaults are safe', () => {
    assert.equal(parseUsageFilter('bad-value'), 'all');
    assert.equal(parseUsageSortKey('bad-value'), 'total');
});

void test('Given multiple rows When paging Then requested slice is returned', () => {
    assert.deepEqual(pageItems(usageRows, 2, 2).map(item => item.companyName), ['테스트']);
});
