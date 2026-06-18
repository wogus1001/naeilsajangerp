import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    toAdminIntakePropertyView,
    type FranchiseAdminIntakeLocationRow,
    type FranchiseAdminIntakePropertyRow
} from './franchise-admin-intake-view.js';

const propertyRow = {
    id: 'property-1',
    company_id: 'company-a',
    manager_id: 'manager-a',
    name: '강남역 1층 코너',
    status: '공실',
    operation_type: '물건등록',
    address: '서울 강남구 테헤란로 123',
    created_at: '2026-06-17T00:00:00.000Z',
    updated_at: '2026-06-18T00:00:00.000Z',
    data: { region: '서울 강남구' }
} satisfies FranchiseAdminIntakePropertyRow;

const locationRows = [
    {
        id: 'location-b',
        company_id: 'company-b',
        manager_id: 'manager-b',
        source_property_id: 'property-1',
        updated_at: '2026-06-18T02:00:00.000Z',
        data: { sourcePropertySnapshot: { updatedAt: '2026-06-18T00:00:00.000Z' } }
    },
    {
        id: 'location-a',
        company_id: 'company-a',
        manager_id: 'manager-a',
        source_property_id: 'property-1',
        updated_at: '2026-06-18T01:00:00.000Z',
        data: { sourcePropertySnapshot: { updatedAt: '2026-06-17T00:00:00.000Z' } }
    }
] satisfies readonly FranchiseAdminIntakeLocationRow[];

test('Given multiple promoted property targets When selecting a company Then that company location is used', () => {
    const view = toAdminIntakePropertyView(propertyRow, new Map([['company-a', '민티아']]), locationRows, 'company-a');

    assert.equal(view.promotedLocationId, 'location-a');
    assert.equal(view.promotedCompanyId, 'company-a');
    assert.equal(view.promotionCount, 2);
    assert.deepEqual([...view.promotedCompanyIds].sort(), ['company-a', 'company-b']);
    assert.equal(view.syncStatus, 'stale');
});

test('Given multiple promoted property targets When no company is selected Then latest location is used', () => {
    const view = toAdminIntakePropertyView(propertyRow, new Map(), locationRows, '');

    assert.equal(view.promotedLocationId, 'location-b');
    assert.equal(view.promotedCompanyId, 'company-b');
    assert.equal(view.promotionCount, 2);
});
