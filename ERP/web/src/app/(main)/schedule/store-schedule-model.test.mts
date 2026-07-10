import assert from 'node:assert/strict';
import { test } from 'node:test';

type StoreScheduleModelModule = {
    readonly buildLegacyScheduleRedirectPath: (value: string | readonly string[] | undefined) => string;
};
const modelImport = (await import('./store-schedule-model.js')) as unknown as Partial<StoreScheduleModelModule> & {
    readonly default?: StoreScheduleModelModule;
};
const modelModule = modelImport.default || modelImport as StoreScheduleModelModule;
const { buildLegacyScheduleRedirectPath } = modelModule;

test('Given approval document id When opening legacy schedule link Then franchise schedule redirect path is exact', () => {
    const redirectPath = buildLegacyScheduleRedirectPath('doc-1');

    assert.equal(redirectPath, '/dashboard/franchise-operations/schedule?approvalDocumentId=doc-1');
});

test('Given missing approval document id When opening legacy schedule Then no redirect path is returned', () => {
    const redirectPath = buildLegacyScheduleRedirectPath(undefined);

    assert.equal(redirectPath, '');
});

test('Given approval document id with reserved characters When building redirect Then value is encoded', () => {
    const redirectPath = buildLegacyScheduleRedirectPath('doc 1/2');

    assert.equal(redirectPath, '/dashboard/franchise-operations/schedule?approvalDocumentId=doc%201%2F2');
});
