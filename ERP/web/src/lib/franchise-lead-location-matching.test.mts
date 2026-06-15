import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildLeadLocationMatches } from './franchise-lead-location-matching.js';
import type { LeadLocationMatchLocation } from './franchise-lead-location-matching.js';

const locations: readonly LeadLocationMatchLocation[] = [
    {
        id: 'loc-1',
        name: '광진 자양 후보지',
        locationType: '예정점',
        status: '검토중',
        brand: '미카도',
        region: '서울 광진구',
        address: '서울특별시 광진구 자양동',
        competitionScan: { totalCount: 6 }
    },
    {
        id: 'loc-2',
        name: '마포 운영점',
        locationType: '가맹점',
        status: '운영중',
        brand: '다른브랜드',
        region: '서울 마포구',
        address: '서울특별시 마포구 합정동',
        competitionScan: { totalCount: 36 }
    }
];

test('buildLeadLocationMatches ranks same-region same-brand candidate first', () => {
    const matches = buildLeadLocationMatches({
        desiredRegion: '서울특별시 광진구',
        interestedBrand: '미카도',
        budgetFit: '적합',
        regionFit: '적합',
        brandFit: '적합'
    }, locations);

    assert.equal(matches[0]?.location.id, 'loc-1');
    assert.equal(matches[0]?.reasons.includes('관심브랜드 일치'), true);
    assert.equal(matches[0]?.score, 100);
});

test('buildLeadLocationMatches returns empty matches when there is no lead or location', () => {
    assert.deepEqual(buildLeadLocationMatches(null, locations), []);
    assert.deepEqual(buildLeadLocationMatches({ desiredRegion: '서울 광진구' }, []), []);
});

test('buildLeadLocationMatches keeps competition risk visible for dense areas', () => {
    const matches = buildLeadLocationMatches({
        desiredRegion: '서울 마포구',
        interestedBrand: '다른브랜드'
    }, locations);

    assert.equal(matches[0]?.location.id, 'loc-2');
    assert.equal(matches[0]?.risks.includes('경쟁업체 36곳'), true);
});
