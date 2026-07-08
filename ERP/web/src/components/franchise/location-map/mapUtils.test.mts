import assert from 'node:assert/strict';
import { test } from 'node:test';
import type {
    FranchiseLocation,
    FranchiseLocationStatus
} from '../operations/types.js';
import {
    buildComparisonRadiusPoints,
    buildRadiusAnalysisFromPosition,
    buildRadiusAnalysis,
    buildLocationMapCounts,
    filterLocationMapItems,
    getLocationPathDistanceMeters,
    getLocationPolygonAreaSquareMeters,
    getLocationDistanceMeters,
    getLocationMapKind,
    getStoredPosition
} from './mapUtils.js';
import type { LocationMapPoint } from './types.js';

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

function makePoint(overrides: Partial<FranchiseLocation>): LocationMapPoint {
    const location = makeLocation(overrides);
    return {
        location,
        kind: getLocationMapKind(location),
        position: {
            lat: Number(location.latitude),
            lng: Number(location.longitude)
        },
        source: 'stored'
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

test('Given two map positions When measuring distance Then the result is returned in meters', () => {
    const distance = getLocationDistanceMeters(
        { lat: 37.55, lng: 127.08 },
        { lat: 37.551, lng: 127.081 }
    );

    assert.equal(Math.round(distance), 142);
});

test('Given multiple map positions When measuring a path Then segment distances are summed', () => {
    const distance = getLocationPathDistanceMeters([
        { lat: 37.55, lng: 127.08 },
        { lat: 37.551, lng: 127.081 },
        { lat: 37.552, lng: 127.082 }
    ]);

    assert.equal(Math.round(distance), 284);
});

test('Given a closed area path When measuring polygon area Then square meters are approximated', () => {
    const area = getLocationPolygonAreaSquareMeters([
        { lat: 37.55, lng: 127.08 },
        { lat: 37.55, lng: 127.081 },
        { lat: 37.551, lng: 127.081 },
        { lat: 37.551, lng: 127.08 }
    ]);

    assert.ok(area > 9700);
    assert.ok(area < 9900);
});

test('Given an active point When building radius analysis Then nearby points are sorted and self is excluded', () => {
    const activePoint = makePoint({ id: 'active', name: '광진 운영점', latitude: 37.55, longitude: 127.08 });
    const closeCandidate = makePoint({
        id: 'close-candidate',
        name: '가까운 후보지',
        locationType: '예정점',
        status: '검토중',
        latitude: 37.551,
        longitude: 127.081
    });
    const closerOperation = makePoint({
        id: 'closer-operation',
        name: '더 가까운 운영점',
        locationType: '가맹점',
        status: '오픈준비',
        latitude: 37.5504,
        longitude: 127.0803
    });
    const farCandidate = makePoint({
        id: 'far-candidate',
        name: '먼 후보지',
        locationType: '예정점',
        latitude: 37.57,
        longitude: 127.10
    });

    const analysis = buildRadiusAnalysis(
        activePoint,
        [farCandidate, activePoint, closeCandidate, closerOperation],
        500
    );

    assert.deepEqual(
        analysis.nearbyPoints.map(item => item.point.location.id),
        ['closer-operation', 'close-candidate']
    );
    assert.equal(analysis.operationCount, 1);
    assert.equal(analysis.candidateCount, 1);
    assert.equal(analysis.statusCounts.오픈준비, 1);
    assert.equal(analysis.statusCounts.검토중, 1);
});

test('Given no active point When building radius analysis Then an empty analysis is returned', () => {
    const analysis = buildRadiusAnalysis(null, [makePoint({ id: 'operation' })], 1000);

    assert.equal(analysis.nearbyPoints.length, 0);
    assert.equal(analysis.operationCount, 0);
    assert.equal(analysis.candidateCount, 0);
    assert.equal(analysis.statusCounts.운영중, 0);
});

test('Given selected radius analysis When building comparison radius points Then nearby map points are returned', () => {
    const activePoint = makePoint({ id: 'active', name: '선택 물건지', latitude: 37.55, longitude: 127.08 });
    const nearbyPoint = makePoint({
        id: 'nearby',
        name: '인접 물건지',
        latitude: 37.551,
        longitude: 127.081
    });
    const analysis = buildRadiusAnalysis(activePoint, [activePoint, nearbyPoint], 500);

    assert.deepEqual(
        buildComparisonRadiusPoints(analysis, 'selected').map(point => point.location.id),
        ['nearby']
    );
});

test('Given manual radius analysis When building comparison radius points Then no extra circles are returned', () => {
    const nearbyPoint = makePoint({ id: 'nearby', name: '인접 물건지', latitude: 37.551, longitude: 127.081 });
    const analysis = buildRadiusAnalysisFromPosition({ lat: 37.55, lng: 127.08 }, [nearbyPoint], 500);

    assert.equal(buildComparisonRadiusPoints(analysis, 'manual').length, 0);
});

test('Given a manually picked center When building radius analysis Then nearby map points are included by distance', () => {
    const closeOperation = makePoint({
        id: 'close-operation',
        name: '직접 반경 운영점',
        latitude: 37.5502,
        longitude: 127.0802
    });
    const closeCandidate = makePoint({
        id: 'close-candidate',
        name: '직접 반경 후보지',
        locationType: '예정점',
        status: '검토중',
        latitude: 37.551,
        longitude: 127.081
    });
    const farCandidate = makePoint({
        id: 'far-candidate',
        name: '먼 후보지',
        locationType: '예정점',
        latitude: 37.57,
        longitude: 127.10
    });

    const analysis = buildRadiusAnalysisFromPosition(
        { lat: 37.55, lng: 127.08 },
        [farCandidate, closeCandidate, closeOperation],
        500
    );

    assert.deepEqual(
        analysis.nearbyPoints.map(item => item.point.location.id),
        ['close-operation', 'close-candidate']
    );
    assert.equal(analysis.operationCount, 1);
    assert.equal(analysis.candidateCount, 1);
});
