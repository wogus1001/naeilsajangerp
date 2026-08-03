import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(fileName: string): string {
    return readFileSync(new URL(fileName, import.meta.url), 'utf8');
}

test('Given the location demo When its adapter is inspected Then production interactions stay local', () => {
    // Given
    const source = readSource('./DemoLocationAdapter.tsx');

    // When
    const productionSectionIsInjected = /<LocationMasterSection[\s\S]*interactionRuntime=/.test(source);

    // Then
    assert.equal(productionSectionIsInjected, true);
    assert.match(source, /addressLookupSource=/);
    assert.match(source, /brandSearchSource=/);
    assert.match(source, /showConfirm/);
    assert.doesNotMatch(source, /DemoRecordDrawer/);
    assert.doesNotMatch(source, /fetch\(/);
    assert.doesNotMatch(source, /\/api\//);
});

test('Given the operations demo When its adapter is inspected Then it delegates the whole workspace', () => {
    // Given
    const source = readSource('./DemoOperationsAdapter.tsx');

    // When
    const productionWorkspaceIsControlled = /<FranchiseOperationsWorkspace[\s\S]*model=\{model\}[\s\S]*actions=\{actions\}/.test(source);

    // Then
    assert.equal(productionWorkspaceIsControlled, true);
    assert.match(source, /addressLookupSource=/);
    assert.match(source, /brandSearchSource=/);
    assert.match(source, /openOwnerPortal/);
    assert.match(source, /showConfirm/);
    assert.doesNotMatch(source, /DemoRecordDrawer/);
    assert.doesNotMatch(source, /FranchiseLocationList/);
    assert.doesNotMatch(source, /OperationsSummary/);
    assert.doesNotMatch(source, /fetch\(/);
    assert.doesNotMatch(source, /\/api\//);
});
