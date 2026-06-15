import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildManualPromotedPropertyPayload,
    buildPromotedListingData,
    parseExternalListingPromotionRow
} from './realty-listing-promotion.js';

const listingRow = {
    id: 'listing-row-1',
    company_id: 'company-1',
    requester_id: 'requester-1',
    import_job_id: 'job-1',
    property_id: null,
    duplicate_of_property_id: 'property-duplicate',
    source: 'daangn',
    source_listing_id: 'daangn-1',
    source_url: 'https://example.test/realty/1',
    title: '상가 1,000만원/80만원',
    address: '서울특별시 광진구 구의동 12',
    region: '서울특별시 광진구 구의동',
    latitude: null,
    longitude: null,
    trade_type: '월세',
    property_type: '상가',
    deposit_amount: 1000,
    monthly_rent: 80,
    sale_price: null,
    maintenance_fee: 10,
    area_sqm: 33,
    area_pyeong: '10평',
    floor_info: '1',
    image_urls: ['https://example.test/photo.jpg'],
    status: 'imported',
    collected_at: '2026-06-10T01:00:00.000Z',
    raw: { watchCount: 7 },
    data: { favorite: true }
};

test('parseExternalListingPromotionRow keeps only promotable external listing rows', () => {
    const parsed = parseExternalListingPromotionRow(listingRow);

    assert.equal(parsed?.id, 'listing-row-1');
    assert.equal(parsed?.source, 'daangn');
    assert.equal(parsed?.source_listing_id, 'daangn-1');
    assert.equal(parsed?.data.favorite, true);
    assert.equal(parseExternalListingPromotionRow({ ...listingRow, source_listing_id: '' }), null);
});

test('buildManualPromotedPropertyPayload maps an external listing to a manual ERP property insert', () => {
    const parsed = parseExternalListingPromotionRow(listingRow);
    assert.ok(parsed);

    const payload = buildManualPromotedPropertyPayload({
        row: parsed,
        propertyId: 'property-1',
        companyId: 'company-1',
        managerId: 'manager-1',
        promotedAt: '2026-06-11T00:00:00.000Z'
    });

    assert.equal(payload.id, 'property-1');
    assert.equal(payload.company_id, 'company-1');
    assert.equal(payload.manager_id, 'manager-1');
    assert.equal(payload.name, '상가 1,000만원/80만원');
    assert.equal(payload.operation_type, 'external');
    assert.equal(payload.status, 'hold');
    assert.equal(payload.data.externalImportMode, 'manual-promoted');
    assert.equal(payload.data.externalListingRecordId, 'listing-row-1');
    assert.equal(payload.data.externalDuplicateOfPropertyId, 'property-duplicate');
});

test('buildPromotedListingData preserves existing listing data while recording the property link', () => {
    const nextData = buildPromotedListingData({
        currentData: { favorite: true, note: 'keep' },
        propertyId: 'property-1',
        promotedAt: '2026-06-11T00:00:00.000Z'
    });

    assert.deepEqual(nextData, {
        favorite: true,
        note: 'keep',
        promotionMode: 'manual',
        promotedAt: '2026-06-11T00:00:00.000Z',
        promotedToPropertyId: 'property-1'
    });
});
