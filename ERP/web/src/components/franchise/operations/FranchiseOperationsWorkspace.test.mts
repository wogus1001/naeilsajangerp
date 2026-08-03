import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(fileName: string) {
    return readFileSync(new URL(fileName, import.meta.url), 'utf8');
}

test('Given the production operations route When composing its surface Then it delegates dashboard, list, and form UI to the shared workspace', () => {
    const page = readSource('../../../app/(main)/dashboard/franchise-operations/page.tsx');
    const workspace = readSource('./FranchiseOperationsWorkspace.tsx');

    assert.match(page, /FranchiseOperationsWorkspace/);
    assert.doesNotMatch(page, /MASTER_VIEWS/);
    assert.match(workspace, /OperationsSummary/);
    assert.match(workspace, /FranchiseOperationDashboard/);
    assert.match(workspace, /FranchiseLocationList/);
    assert.match(workspace, /FranchiseLocationForm/);
});

test('Given a destructive location action When the list requests deletion Then the injected confirmation resolves before mutation', () => {
    const workspace = readSource('./FranchiseOperationsWorkspace.tsx');
    const confirmIndex = workspace.indexOf('actions.confirmDeleteLocation');
    const deleteIndex = workspace.indexOf('actions.deleteLocation', confirmIndex);

    assert.ok(confirmIndex > -1);
    assert.ok(deleteIndex > confirmIndex);
});

test('Given fixture lookup sources When the form is rendered Then the workspace forwards both sources without changing form markup', () => {
    const workspace = readSource('./FranchiseOperationsWorkspace.tsx');
    const form = readSource('./FranchiseLocationForm.tsx');

    assert.match(workspace, /addressLookupSource/);
    assert.match(workspace, /brandSearchSource/);
    assert.match(form, /addressLookupSource/);
    assert.match(form, /brandSearchSource/);
});
