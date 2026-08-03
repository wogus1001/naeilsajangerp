import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_LOCATION_FORM, type FranchiseLocation } from '@/components/franchise/operations/types';
import {
    applyDemoOperationAddress,
    applyDemoOperationBrand,
    deleteDemoOperation,
    getDemoOperationCounts,
    saveDemoOperationForm,
    updateDemoOperationStatus
} from './DemoOperationsState.js';

const BASE_LOCATION = {
    id: 'operation-a',
    companyId: 'demo-company',
    managerId: 'manager-kim',
    name: '미카도 강남점',
    locationType: '가맹점',
    brand: '미카도',
    status: '운영중',
    region: '서울 강남구',
    address: '서울 강남구 테헤란로 1',
    latitude: 37.5,
    longitude: 127.02,
    openedAt: '2026-01-01',
    memo: '기존 메모',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    sourcePropertyId: 'property-a'
} as const satisfies FranchiseLocation;

test('Given a registration form When it is saved Then a normalized local operation is prepended', () => {
    // Given
    const form = {
        ...EMPTY_LOCATION_FORM,
        name: '  미카도 마포점  ',
        brand: '미카도',
        region: '  서울 마포구  ',
        address: ' 서울 마포구 월드컵로 1 ',
        memo: '  오픈 교육 예정  '
    };

    // When
    const result = saveDemoOperationForm({
        locations: [BASE_LOCATION],
        form,
        fallbackId: 'operation-new',
        timestamp: '2026-07-30T00:00:00.000Z'
    });

    // Then
    assert.equal(result.location.id, 'operation-new');
    assert.equal(result.location.name, '미카도 마포점');
    assert.equal(result.location.region, '서울 마포구');
    assert.equal(result.locations[0]?.id, 'operation-new');
});

test('Given an existing operation When its form is saved Then non-form source fields are preserved', () => {
    // Given
    const form = {
        ...EMPTY_LOCATION_FORM,
        id: BASE_LOCATION.id,
        name: '미카도 강남점 수정',
        brand: '미카도',
        region: BASE_LOCATION.region,
        address: BASE_LOCATION.address
    };

    // When
    const result = saveDemoOperationForm({
        locations: [BASE_LOCATION],
        form,
        fallbackId: 'unused',
        timestamp: '2026-07-30T01:00:00.000Z'
    });

    // Then
    assert.equal(result.location.name, '미카도 강남점 수정');
    assert.equal(result.location.sourcePropertyId, 'property-a');
    assert.equal(result.location.createdAt, BASE_LOCATION.createdAt);
});

test('Given an operation When its status changes Then only the matching row changes', () => {
    // Given
    const other = { ...BASE_LOCATION, id: 'operation-b', name: '성수점' };

    // When
    const updated = updateDemoOperationStatus([BASE_LOCATION, other], BASE_LOCATION.id, '휴점');

    // Then
    assert.equal(updated[0]?.status, '휴점');
    assert.equal(updated[1]?.status, '운영중');
});

test('Given two operations When one is deleted Then only the other remains', () => {
    // Given
    const other = { ...BASE_LOCATION, id: 'operation-b', name: '성수점' };

    // When
    const remaining = deleteDemoOperation([BASE_LOCATION, other], BASE_LOCATION.id);

    // Then
    assert.deepEqual(remaining.map(location => location.id), ['operation-b']);
});

test('Given mixed statuses When counts are derived Then dashboard totals match the local rows', () => {
    // Given
    const locations = [
        BASE_LOCATION,
        { ...BASE_LOCATION, id: 'operation-b', status: '오픈준비' },
        { ...BASE_LOCATION, id: 'operation-c', status: '휴점' }
    ] satisfies readonly FranchiseLocation[];

    // When
    const counts = getDemoOperationCounts(locations);

    // Then
    assert.deepEqual(counts, { activeCount: 1, openingCount: 1, pausedCount: 1 });
});

test('Given a form When a fixture address is selected Then address coordinates replace the draft values', () => {
    // Given
    const result = {
        address: '서울 성동구 아차산로 10',
        roadAddress: '서울 성동구 아차산로 10',
        jibunAddress: '',
        region: '서울 성동구',
        latitude: 37.54,
        longitude: 127.05,
        buildingName: '성수빌딩',
        zoneNo: '04790',
        addressType: 'R'
    };

    // When
    const form = applyDemoOperationAddress(EMPTY_LOCATION_FORM, result);

    // Then
    assert.equal(form.address, result.address);
    assert.equal(form.region, result.region);
    assert.equal(form.latitude, result.latitude);
});

test('Given a form When a fixture brand is selected Then brand classification fields are filled', () => {
    // Given
    const brand = {
        id: 'brand-mikado',
        brandName: '미카도',
        industry: '외식',
        businessType: '일식',
        categoryMajor: '외식',
        categoryMiddle: '일식',
        categorySmall: '초밥',
        recommendedKeywords: ['일식'],
        isSaved: true
    };

    // When
    const form = applyDemoOperationBrand(EMPTY_LOCATION_FORM, brand);

    // Then
    assert.equal(form.brandId, brand.id);
    assert.equal(form.businessType, brand.businessType);
    assert.equal(form.competitionKeyword, '일식');
});
