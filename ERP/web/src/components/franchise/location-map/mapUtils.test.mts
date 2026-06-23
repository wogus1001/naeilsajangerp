import assert from 'node:assert/strict';
import { test } from 'node:test';
import type {
    FranchiseLocation,
    FranchiseLocationStatus
} from '../operations/types.js';
import {
    buildLocationMapCounts,
    filterLocationMapItems,
    getLocationMapKind,
    getStoredPosition
} from './mapUtils.js';

function makeLocation(overrides: Partial<FranchiseLocation>): FranchiseLocation {
    return {
        id: 'location-1',
        name: '내일 광진점',
        locationType: '가맹점',
        brand: '미카도',
        status: '운영중',
        region: '서울 광진구',
        address: '서울 광진구 능동로 50길 8',
        latitude: 37.55,
        longitude: 127.08,
        openedAt: null,
        memo: '',
        ...overrides
    };
}

test('Given franchise locations When reading map kind Then operation and candidate are separated by location type', () => {
    assert.equal(getLocationMapKind(makeLocation({ locationType: '가맹점', status: '오픈준비' })), 'operation');
    assert.equal(getLocationMapKind(makeLocation({ locationType: '예정점', status: '검토중' })), 'candidate');
});

test('Given map filters When filtering locations Then mode status and query are applied together', () => {
    const locations = [
        makeLocation({ id: 'operation-1', name: '내일 광진점', locationType: '가맹점', status: '운영중' }),
        makeLocation({ id: 'candidate-1', name: '성수 후보지', locationType: '예정점', status: '검토중', brand: '치킨' })
    ];

    const result = filterLocationMapItems(locations, {
        mode: 'candidates',
        query: '성수',
        statuses: new Set<FranchiseLocationStatus>(['검토중'])
    });

    assert.deepEqual(result.map(location => location.id), ['candidate-1']);
});

test('Given visible points When building counts Then unmapped items remain visible as missing coordinate count', () => {
    const visibleLocations = [
        makeLocation({ id: 'operation-1', locationType: '가맹점' }),
        makeLocation({ id: 'candidate-1', locationType: '예정점', latitude: null, longitude: null })
    ];
    const point = {
        location: visibleLocations[0],
        kind: 'operation',
        position: { lat: 37.55, lng: 127.08 },
        source: 'stored'
    } as const;

    const counts = buildLocationMapCounts(visibleLocations, visibleLocations, [point]);

    assert.equal(counts.operation, 1);
    assert.equal(counts.candidate, 1);
    assert.equal(counts.mappable, 1);
    assert.equal(counts.unmapped, 1);
});

test('Given saved coordinates When reading stored position Then Korea coordinates are preserved', () => {
    assert.deepEqual(
        getStoredPosition(makeLocation({ latitude: 35.1631, longitude: 129.1635 })),
        { lat: 35.1631, lng: 129.1635 }
    );
});

test('Given swapped saved coordinates When reading stored position Then latitude and longitude are corrected', () => {
    assert.deepEqual(
        getStoredPosition(makeLocation({ latitude: 129.1635, longitude: 35.1631 })),
        { lat: 35.1631, lng: 129.1635 }
    );
});

test('Given out-of-range saved coordinates When reading stored position Then the map falls back to geocoding', () => {
    assert.equal(getStoredPosition(makeLocation({ latitude: 91, longitude: 181 })), null);
});
