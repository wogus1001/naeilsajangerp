import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getRealtySavedRegionKeyFromText,
    getSavedRegions,
    groupListings
} from './utils.js';
import type { RealtyImportedListing, RealtyListingRecord } from './types.js';

const baseListing = {
    id: 'listing-1',
    source: 'daangn',
    sourceListingId: 'source-1',
    sourceUrl: 'https://example.test/listings/1',
    title: '상가',
    address: '서울특별시 광진구 광나루로 D동 1층',
    region: '서울특별시 광진구 구의동',
    tradeType: '월세',
    propertyType: '상가',
    depositAmount: 1000,
    monthlyRent: 80,
    salePrice: null,
    maintenanceFee: null,
    areaSqm: null,
    areaPyeong: '10평',
    floorInfo: '1',
    status: 'active'
} satisfies RealtyListingRecord;

function makeImportedListing(listing: RealtyListingRecord): RealtyImportedListing {
    return {
        action: 'created',
        listing
    };
}

test('groupListings prefers the administrative unit from region over address building tokens', () => {
    const groups = groupListings([
        makeImportedListing(baseListing),
        makeImportedListing({
            ...baseListing,
            id: 'listing-2',
            sourceListingId: 'source-2',
            address: '서울특별시 광진구 웨딩홀 에이동',
            region: '서울 광진구'
        }),
        makeImportedListing({
            ...baseListing,
            id: 'listing-3',
            sourceListingId: 'source-3',
            address: '서울특별시 광진구 능동 12',
            region: ''
        })
    ]);

    assert.deepEqual(groups.map(group => group.key), ['광진구', '구의동', '능동']);
});

test('getSavedRegions groups saved listings by normalized district labels', () => {
    const regions = getSavedRegions([
        makeImportedListing(baseListing),
        makeImportedListing({
            ...baseListing,
            id: 'listing-2',
            sourceListingId: 'source-2',
            region: '서울 광진구 자양동'
        }),
        makeImportedListing({
            ...baseListing,
            id: 'listing-3',
            sourceListingId: 'source-3',
            region: '경기도 성남시 분당구 정자동'
        })
    ]);

    assert.deepEqual(regions.map(region => `${region.key}:${region.count}`), [
        '서울 광진구:2',
        '경기 분당구:1'
    ]);
});

test('getRealtySavedRegionKeyFromText converts selected region text to the saved-region key', () => {
    assert.equal(getRealtySavedRegionKeyFromText('서울특별시 광진구'), '서울 광진구');
    assert.equal(getRealtySavedRegionKeyFromText('서울 광진구'), '서울 광진구');
});
