import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(fileName: string): string {
    return readFileSync(new URL(fileName, import.meta.url), 'utf8');
}

test('controlled location map workspace composes the production map surface', () => {
    const workspace = readSource('./FranchiseLocationMapWorkspace.tsx');

    assert.match(workspace, /FranchiseLocationMapFilters/);
    assert.match(workspace, /FranchiseLocationMapCanvas/);
    assert.match(workspace, /FranchiseLocationMapPanel/);
    assert.match(workspace, /errorMessage/);
    assert.match(workspace, /isBusy/);
    assert.match(workspace, /onMeasurementModeChange/);
    assert.match(workspace, /onStartRadiusPicking/);
    assert.match(workspace, /onRadiusCenterPick/);
    assert.match(workspace, /mapRuntime = 'live'/);
    assert.match(workspace, /runtime=\{mapRuntime\}/);
});

test('live location map service delegates its composition to the controlled workspace', () => {
    const service = readSource('./FranchiseLocationMapService.tsx');

    assert.match(service, /useFranchiseLocationMapController\(kakaoReady\)/);
    assert.match(service, /<FranchiseLocationMapWorkspace/);
    assert.doesNotMatch(service, /<FranchiseLocationMapFilters/);
    assert.doesNotMatch(service, /<FranchiseLocationMapCanvas/);
    assert.doesNotMatch(service, /<FranchiseLocationMapPanel/);
});

test('controlled workspace type exposes state and actions for demo fixtures', () => {
    const types = readSource('./types.ts');

    for (const field of [
        'filters',
        'points',
        'activePoint',
        'focusedPoint',
        'radiusAnalysis',
        'measurementPoints',
        'onSelectPoint',
        'onToggleStatus',
        'onMeasurementPointAdd',
        'onMeasurementUndo'
    ]) {
        assert.match(types, new RegExp(`readonly ${field}`));
    }
});
