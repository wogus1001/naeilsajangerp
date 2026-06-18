import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    toAdminIntakePropertyView,
    toAdminMatchingRequestView,
    type FranchiseAdminIntakeMatchingRequestRow,
    type FranchiseAdminIntakeLocationRow,
    type FranchiseAdminIntakePropertyRow
} from './franchise-admin-intake-view.js';
import { MATCHING_REQUEST_PROMOTIONS_KEY } from './franchise-matching-request-promotion-links.js';

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
    const view = toAdminIntakePropertyView(propertyRow, new Map([
        ['company-a', '민티아'],
        ['company-b', '미카도']
    ]), locationRows, 'company-a');

    assert.equal(view.promotedLocationId, 'location-a');
    assert.equal(view.promotedCompanyId, 'company-a');
    assert.equal(view.promotionCount, 2);
    assert.deepEqual([...view.promotedCompanyIds].sort(), ['company-a', 'company-b']);
    assert.deepEqual(view.promotedCompanyNames, ['미카도', '민티아']);
    assert.equal(view.syncStatus, 'stale');
});

test('Given multiple promoted property targets When no company is selected Then latest location is used', () => {
    const view = toAdminIntakePropertyView(propertyRow, new Map(), locationRows, '');

    assert.equal(view.promotedLocationId, 'location-b');
    assert.equal(view.promotedCompanyId, 'company-b');
    assert.equal(view.promotionCount, 2);
});

test('Given promoted matching request targets When building admin view Then target company names are exposed', () => {
    const row = {
        id: 'lead-1',
        company_id: 'source-company',
        manager_id: 'manager-a',
        name: '박매칭',
        mobile: '010-0000-0000',
        source: '프랜차이즈 매칭 요청',
        status: '문의접수',
        grade: '미지정',
        desired_region: '서울 강남구',
        interested_brand: '미카도',
        budget_min: null,
        budget_max: null,
        memo: '',
        next_contact_at: null,
        created_at: '2026-06-17T00:00:00.000Z',
        updated_at: '2026-06-18T00:00:00.000Z',
        data: {
            [MATCHING_REQUEST_PROMOTIONS_KEY]: [
                {
                    promotedLeadId: 'target-lead-a',
                    targetCompanyId: 'company-a',
                    targetManagerId: '',
                    promotedAt: '2026-06-18T01:00:00.000Z',
                    promotedBy: 'admin'
                },
                {
                    promotedLeadId: 'target-lead-b',
                    targetCompanyId: 'company-b',
                    targetManagerId: '',
                    promotedAt: '2026-06-18T02:00:00.000Z',
                    promotedBy: 'admin'
                }
            ]
        }
    } satisfies FranchiseAdminIntakeMatchingRequestRow;

    const view = toAdminMatchingRequestView(row, new Map(), new Map([
        ['company-a', '민티아'],
        ['company-b', '미카도']
    ]), '');

    assert.equal(view.promotionCount, 2);
    assert.deepEqual(view.promotedCompanyIds, ['company-a', 'company-b']);
    assert.deepEqual(view.promotedCompanyNames, ['민티아', '미카도']);
});
