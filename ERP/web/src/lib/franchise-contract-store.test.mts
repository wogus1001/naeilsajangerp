import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildContractStoreLocationDraft,
    getExistingContractStoreLinkError,
    getContractStoreDraftValidationError,
    isOperationalContractStoreLocation,
    readContractStoreSourceType,
    type ContractStoreLeadInput,
    type ContractStoreSourceInput
} from './franchise-contract-store.js';

const lead: ContractStoreLeadInput = {
    id: 'lead-1',
    companyId: 'company-1',
    managerId: 'manager-1',
    name: '김계약',
    mobile: '01012345678',
    status: '계약완료',
    interestedBrand: '내일',
    desiredRegion: '서울 강남구',
    budgetMin: 5000,
    budgetMax: 9000
};

test('Given a linked candidate location When building a contract store draft Then source is preserved and a franchise store is created', () => {
    const source: ContractStoreSourceInput = {
        id: 'location-1',
        sourceType: 'franchise_location',
        name: '강남역 후보지',
        locationType: '예정점',
        brand: '내일',
        status: '검토중',
        region: '서울 강남구',
        address: '서울 강남구 테헤란로 1',
        latitude: 37.1,
        longitude: 127.1,
        sourcePropertyId: 'property-1',
        memo: '대로변'
    };

    const draft = buildContractStoreLocationDraft({
        lead,
        source,
        draft: {},
        nowIso: '2026-06-23T09:00:00.000Z'
    });

    assert.equal(draft.locationType, '가맹점');
    assert.equal(draft.status, '오픈준비');
    assert.equal(draft.sourceLocationId, 'location-1');
    assert.equal(draft.sourcePropertyId, 'property-1');
    assert.equal(draft.contractLeadId, 'lead-1');
    assert.equal(draft.region, '서울 강남구');
    assert.equal(draft.address, '서울 강남구 테헤란로 1');
    assert.equal(draft.latitude, 37.1);
    assert.equal(draft.longitude, 127.1);
    assert.equal(draft.sourceCandidateSnapshot.locationType, '예정점');
    assert.equal(draft.sourceCandidateSnapshot.latitude, 37.1);
    assert.equal(draft.sourceCandidateSnapshot.longitude, 127.1);
});

test('Given no linked source When building a direct contract store draft Then lead defaults and manual edits are used', () => {
    const draft = buildContractStoreLocationDraft({
        lead,
        source: null,
        draft: {
            name: '강남역점',
            region: '서울 강남구',
            address: '서울 강남구 강남대로 10',
            memo: '직접 입력'
        },
        nowIso: '2026-06-23T09:00:00.000Z'
    });

    assert.equal(draft.name, '강남역점');
    assert.equal(draft.brand, '내일');
    assert.equal(draft.sourceLocationId, '');
    assert.equal(draft.sourceExternalListingId, '');
    assert.equal(draft.memo, '직접 입력');
});

test('Given an unknown source type When reading contract store source type Then direct is used', () => {
    assert.equal(readContractStoreSourceType('external_property_listing'), 'external_property_listing');
    assert.equal(readContractStoreSourceType('unknown'), 'direct');
});

test('Given a contract store draft without address When validating Then creation is blocked', () => {
    const draft = buildContractStoreLocationDraft({
        lead,
        source: null,
        draft: {
            name: '주소 없는 가맹점'
        },
        nowIso: '2026-06-23T09:00:00.000Z'
    });

    assert.equal(getContractStoreDraftValidationError(draft), '주소 검색으로 가맹점 주소를 선택해주세요.');
});

test('Given an unlinked operational store When validating an existing store link Then linking is allowed', () => {
    assert.equal(getExistingContractStoreLinkError({
        id: 'store-1',
        locationType: '가맹점',
        status: '오픈준비',
        contractLeadId: ''
    }, lead.id), '');
});

test('Given a candidate location When validating an existing store link Then linking is blocked', () => {
    assert.equal(getExistingContractStoreLinkError({
        id: 'candidate-1',
        locationType: '예정점',
        status: '검토중',
        contractLeadId: ''
    }, lead.id), '가맹점 목록에 등록된 운영점만 연결할 수 있습니다.');
});

test('Given a store linked to another lead When validating an existing store link Then reassignment is blocked', () => {
    assert.equal(getExistingContractStoreLinkError({
        id: 'store-1',
        locationType: '가맹점',
        status: '운영중',
        contractLeadId: 'lead-2'
    }, lead.id), '이미 다른 계약 점주와 연결된 가맹점입니다.');
});

test('Given operational and candidate locations When classifying them Then only the operational store is reusable', () => {
    assert.equal(isOperationalContractStoreLocation({
        id: 'store-1',
        locationType: '가맹점',
        status: '오픈준비'
    }), true);
    assert.equal(isOperationalContractStoreLocation({
        id: 'candidate-1',
        locationType: '예정점',
        status: '검토중'
    }), false);
});
