import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
    buildLocationMapCounts,
    buildRadiusAnalysis,
    filterLocationMapItems,
    getLocationMapKind,
    getStoredPosition
} from '@/components/franchise/location-map/mapUtils';
import { FRANCHISE_LOCATION_STATUSES, type FranchiseLocation } from '@/components/franchise/operations/types';
import { DEMO_LOCATION_MASTER_ITEMS, DEMO_OPERATION_LOCATIONS } from './DemoFranchiseSampleData';

const adapterPath = './DemoLocationMapAdapter.tsx';

function readSource(fileName: string): string {
    return readFileSync(new URL(fileName, import.meta.url), 'utf8');
}

test('demo map adapter composes the controlled production workspace', () => {
    const source = readSource(adapterPath);

    assert.match(source, /FranchiseLocationMapWorkspace/);
    assert.match(source, /mapRuntime="live"/);
    assert.doesNotMatch(source, /mapRuntime="offline"/);
    assert.match(source, /onMeasurementPointAdd/);
    assert.match(source, /onRadiusCenterPick/);
    assert.match(source, /comparisonRadiusPoints/);
    assert.match(source, /radiusCenter/);
    assert.match(source, /focusRequestId/);
    assert.match(source, /focusedPoint/);
    assert.match(source, /DemoGuidedLayout/);
    assert.doesNotMatch(source, /FranchiseLocationMapFilters/);
    assert.doesNotMatch(source, /FranchiseLocationMapPanel/);
    assert.doesNotMatch(source, /staticMapCanvas/);
    assert.doesNotMatch(source, /DEMO_MAP_BOUNDS/);
    assert.doesNotMatch(source, /DEMO_MEASUREMENT_POINTS/);
    assert.doesNotMatch(source, /Kakao UI 흐름 미리보기/);
});

test('demo map adapter has no bespoke map stylesheet', () => {
    assert.equal(existsSync(new URL('./DemoLocationMapAdapter.module.css', import.meta.url)), false);
});

test('demo fixture points preserve map kinds, counts, filters, and radius analysis', () => {
    const locations: readonly FranchiseLocation[] = [
        ...DEMO_OPERATION_LOCATIONS,
        ...DEMO_LOCATION_MASTER_ITEMS
    ];
    const points = locations.flatMap(location => {
        const position = getStoredPosition(location);
        return position ? [{ location, kind: getLocationMapKind(location), position, source: 'stored' as const }] : [];
    });
    const counts = buildLocationMapCounts(locations, locations, points);
    const operationLocations = filterLocationMapItems(locations, {
        mode: 'operations',
        query: '',
        statuses: new Set(FRANCHISE_LOCATION_STATUSES)
    });
    const radiusAnalysis = buildRadiusAnalysis(points[0] ?? null, points, 1000);

    assert.equal(points.length, locations.length);
    assert.equal(counts.operation, DEMO_OPERATION_LOCATIONS.length);
    assert.equal(counts.candidate, DEMO_LOCATION_MASTER_ITEMS.length);
    assert.equal(operationLocations.length, DEMO_OPERATION_LOCATIONS.length);
    assert.ok(points.some(point => point.kind === 'operation'));
    assert.ok(points.some(point => point.kind === 'candidate'));
    assert.equal(radiusAnalysis.radiusMeters, 1000);
    assert.ok(radiusAnalysis.nearbyPoints.length > 0);
});
