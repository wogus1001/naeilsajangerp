import test from 'node:test';
import assert from 'node:assert/strict';
import {
    filterAndSortAlimtalkUsage,
    pageAlimtalkUsage,
    parseAlimtalkUsageFilter,
    parseAlimtalkUsageSortKey
} from './alimtalkOperationsTableState.js';
import type { AlimtalkCompanyUsageSummary } from '../../../lib/alimtalk-operations.js';

const usageRows: readonly AlimtalkCompanyUsageSummary[] = [
    {
        companyId: 'company-a',
        companyName: '내일',
        enabled: true,
        monthlyLimit: 100,
        warningThreshold: 80,
        total: 90,
        success: 88,
        failed: 2,
        blocked: 0,
        fallbackSms: 0,
        recentSentAt: '2026-07-02T00:00:00.000Z'
    },
    {
        companyId: 'company-b',
        companyName: '미래',
        enabled: false,
        monthlyLimit: null,
        warningThreshold: null,
        total: 0,
        success: 0,
        failed: 0,
        blocked: 0,
        fallbackSms: 0,
        recentSentAt: ''
    }
];

void test('Given company usage When filtering limit warning Then near-limit companies remain', () => {
    const result = filterAndSortAlimtalkUsage(usageRows, {
        query: '',
        filter: 'limit_warning',
        sortKey: 'total',
        sortDirection: 'desc'
    });

    assert.deepEqual(result.map(item => item.companyName), ['내일']);
});

void test('Given company usage When searching company id Then matching row is returned', () => {
    const result = filterAndSortAlimtalkUsage(usageRows, {
        query: 'company-b',
        filter: 'all',
        sortKey: 'companyName',
        sortDirection: 'asc'
    });

    assert.deepEqual(result.map(item => item.companyName), ['미래']);
});

void test('Given parser input When unknown values arrive Then defaults are safe', () => {
    assert.equal(parseAlimtalkUsageFilter('bad'), 'all');
    assert.equal(parseAlimtalkUsageSortKey('bad'), 'total');
});

void test('Given rows When paging Then requested slice is returned', () => {
    assert.deepEqual(pageAlimtalkUsage(usageRows, 2, 1).map(item => item.companyName), ['미래']);
});
