import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildManualPromotedLocationDraft,
    buildManualPromotedOperationEntries
} from './manual-promoted-operations.js';

const promotedProperty = {
    id: 'property-1',
    name: '합정동 외부 상가',
    address: '서울 마포구 합정동 1-1',
    externalImportMode: 'manual-promoted',
    externalSourceUrl: 'https://example.test/realty/1',
    deposit: 1000,
    monthlyRent: 120,
    area: '10평',
    floor: '1층'
};

test('buildManualPromotedOperationEntries marks manual-promoted properties ready for operation conversion', () => {
    const entries = buildManualPromotedOperationEntries([promotedProperty], []);

    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.kind, 'ready');
    assert.equal(entries[0]?.property.id, 'property-1');
});

test('buildManualPromotedOperationEntries marks properties linked when a franchise location references the source property', () => {
    const entries = buildManualPromotedOperationEntries([promotedProperty], [{
        id: 'location-1',
        name: '합정점',
        status: '오픈준비',
        sourcePropertyId: 'property-1'
    }]);

    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.kind, 'linked');
    assert.equal(entries[0]?.location?.id, 'location-1');
});

test('buildManualPromotedLocationDraft creates an explicit operation-location payload from the promoted property', () => {
    const draft = buildManualPromotedLocationDraft(promotedProperty);

    assert.deepEqual(draft, {
        sourcePropertyId: 'property-1',
        name: '합정동 외부 상가',
        locationType: '가맹점',
        status: '오픈준비',
        brand: '',
        region: '서울 마포구',
        address: '서울 마포구 합정동 1-1',
        latitude: null,
        longitude: null,
        memo: '외부 상가 수동 승격 물건지에서 운영 전환 후보로 등록'
    });
});
