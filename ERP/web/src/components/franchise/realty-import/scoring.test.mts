import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    filterRealtyListings,
    scoreRealtyListing,
    sortRealtyListings,
    type RealtyFilterState
} from './scoring.js';
import type { RealtyImportedListing, RealtyListingRecord } from './types.js';

const baseListing = {
    id: 'listing-1',
    source: 'daangn',
    sourceListingId: 'source-1',
    sourceUrl: 'https://example.test/listings/1',
    title: '상가',
    address: '서울특별시 광진구 광나루로 12',
    region: '서울특별시 광진구 구의동',
    tradeType: '월세',
    propertyType: '상가',
    depositAmount: 1000,
    monthlyRent: 80,
    salePrice: null,
    maintenanceFee: 10,
    areaSqm: 33,
    areaPyeong: '10평',
    floorInfo: '1',
    status: 'active',
    createdAt: '2026-06-10T01:00:00.000Z',
    raw: {
        watchCount: 6,
        chatRoomCount: 2
    },
    data: {
        favorite: true
    }
} satisfies RealtyListingRecord;

const defaultFilters: RealtyFilterState = {
    favoriteOnly: false,
    groundFloorOnly: false,
    clearMaintenanceOnly: false,
    sortKey: 'score_desc'
};

function makeImportedListing(listing: RealtyListingRecord): RealtyImportedListing {
    return {
        action: 'created',
        listing
    };
}

test('scoreRealtyListing gives stronger candidates a higher score', () => {
    const strongCandidate = makeImportedListing(baseListing);
    const weakCandidate = makeImportedListing({
        ...baseListing,
        id: 'listing-2',
        sourceListingId: 'source-2',
        monthlyRent: null,
        depositAmount: null,
        maintenanceFee: null,
        areaSqm: null,
        areaPyeong: '',
        floorInfo: 'B1',
        raw: {
            watchCount: 0,
            chatRoomCount: 0
        },
        data: {
            favorite: false
        }
    });

    assert.ok(scoreRealtyListing(strongCandidate).score > scoreRealtyListing(weakCandidate).score);
});

test('filterRealtyListings keeps only listings that match enabled filters', () => {
    const groundFloorFavorite = makeImportedListing(baseListing);
    const basementListing = makeImportedListing({
        ...baseListing,
        id: 'listing-2',
        sourceListingId: 'source-2',
        maintenanceFee: null,
        floorInfo: 'B1',
        data: {
            favorite: false
        }
    });

    const filtered = filterRealtyListings([groundFloorFavorite, basementListing], {
        ...defaultFilters,
        favoriteOnly: true,
        groundFloorOnly: true,
        clearMaintenanceOnly: true
    });

    assert.deepEqual(filtered.map(item => item.listing?.id), ['listing-1']);
});

test('sortRealtyListings can order listings by lower monthly rent first', () => {
    const cheaper = makeImportedListing({
        ...baseListing,
        id: 'listing-2',
        sourceListingId: 'source-2',
        monthlyRent: 50
    });
    const expensive = makeImportedListing({
        ...baseListing,
        id: 'listing-3',
        sourceListingId: 'source-3',
        monthlyRent: 120
    });

    const sorted = sortRealtyListings([expensive, cheaper], 'rent_asc');

    assert.deepEqual(sorted.map(item => item.listing?.id), ['listing-2', 'listing-3']);
});
