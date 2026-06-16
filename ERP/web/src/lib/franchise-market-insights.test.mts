import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMarketInsights } from './franchise-market-insights.js';

test('Given leads and planned locations When building market insights Then location count uses only franchise locations', () => {
    const insights = buildMarketInsights([
        {
            desiredRegion: '서울 강남구',
            grade: 'HOT',
            status: '상담중',
            source: 'excel',
            locationLinks: [
                {
                    id: 'link-1',
                    targetType: 'franchise_location',
                    targetId: 'loc-gangnam',
                    status: '제안 예정',
                    memo: '',
                    createdAt: '2026-06-16T00:00:00.000Z'
                }
            ]
        },
        {
            desiredRegion: '서울 강남구',
            grade: '',
            status: '문의접수',
            source: 'manual'
        }
    ], [
        {
            id: 'loc-gangnam',
            name: '강남 후보지',
            region: '서울 강남구',
            locationType: '예정점'
        }
    ]);

    const gangnam = insights.find(item => item.region === '서울 강남구');
    assert.equal(gangnam?.propertyCount, 1);
    assert.equal(gangnam?.linkedLeadCount, 1);
    assert.equal(gangnam?.matchingNeededCount, 1);
});

test('Given multi-region leads When building market insights Then each region receives matching demand', () => {
    const insights = buildMarketInsights([
        {
            desiredRegion: '서울 강남구, 경기 성남시',
            status: '계약예정',
            budgetMin: 10000,
            budgetMax: 20000,
            locationLinks: []
        }
    ], [
        {
            id: 'loc-gangnam',
            name: '강남 후보지',
            region: '서울 강남구',
            locationType: '예정점'
        },
        {
            id: 'loc-seongnam',
            name: '성남 후보지',
            region: '경기 성남시',
            locationType: '예정점'
        }
    ]);

    assert.equal(insights.find(item => item.region === '서울 강남구')?.leadCount, 1);
    assert.equal(insights.find(item => item.region === '경기 성남시')?.leadCount, 1);
    assert.equal(insights.find(item => item.region === '서울 강남구')?.matchingNeededCount, 1);
});

test('Given more than eight regions When building market insights Then all regions remain for pagination', () => {
    const leads = Array.from({ length: 9 }, (_, index) => ({
        desiredRegion: `테스트 ${index + 1}구`,
        status: '문의접수'
    }));

    const insights = buildMarketInsights(leads, []);

    assert.equal(insights.length, 9);
    assert.equal(insights.some(item => item.region === '테스트 9구'), true);
});
