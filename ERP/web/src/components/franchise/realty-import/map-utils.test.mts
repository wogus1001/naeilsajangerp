import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildRealtyMapCandidates,
    getInitialRealtyMapCenter,
    getRealtyListingMapKey
} from './map-utils.js';
import type { RealtyImportedListing, RealtyListingRecord } from './types.js';

const baseListing = {
    id: 'listing-1',
    source: 'daangn',
    sourceListingId: 'source-1',
    sourceUrl: 'https://example.test/listings/1',
    title: '상가',
    address: '서울특별시 광진구 광나루로 12',
    region: '서울특별시 광진구 구의동',
    latitude: 37.545,
    longitude: 127.085,
    tradeType: '월세',
    propertyType: '상가',
    depositAmount: 1000,
    monthlyRent: 80,
    salePrice: null,
    maintenanceFee: 10,
    areaSqm: 33,
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

test('buildRealtyMapCandidates deduplicates addresses and keeps stored coordinates', () => {
    const candidates = buildRealtyMapCandidates([
        makeImportedListing(baseListing),
        makeImportedListing({
            ...baseListing,
            id: 'listing-2',
            sourceListingId: 'source-2',
            address: '서울특별시   광진구 광나루로 12'
        }),
        makeImportedListing({
            ...baseListing,
            id: 'listing-3',
            sourceListingId: 'source-3',
            address: '서울특별시 광진구 능동로 100',
            latitude: null,
            longitude: null
        })
    ]);

    assert.equal(candidates.length, 2);
    assert.deepEqual(candidates[0]?.storedPosition, { lat: 37.545, lng: 127.085 });
    assert.equal(candidates[1]?.storedPosition, null);
});

test('buildRealtyMapCandidates keeps the current page candidates without a hidden global cap', () => {
    const listings = Array.from({ length: 55 }, (_, index) => makeImportedListing({
        ...baseListing,
        id: `listing-${index}`,
        sourceListingId: `source-${index}`,
        address: `서울특별시 광진구 능동로 ${index}`
    }));

    assert.equal(buildRealtyMapCandidates(listings).length, 55);
});

test('getRealtyListingMapKey matches the candidate key used by map markers', () => {
    const [candidate] = buildRealtyMapCandidates([makeImportedListing(baseListing)]);

    assert.equal(getRealtyListingMapKey(baseListing), candidate?.key);
});

test('getInitialRealtyMapCenter averages visible marker positions', () => {
    const center = getInitialRealtyMapCenter([
        { lat: 37.5, lng: 127.0 },
        { lat: 37.6, lng: 127.2 }
    ]);

    assert.deepEqual(center, { lat: 37.55, lng: 127.1 });
});
