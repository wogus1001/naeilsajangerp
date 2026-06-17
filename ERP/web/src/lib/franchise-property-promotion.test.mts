import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildFranchisePropertyPromotionDraft,
    findPromotedSourceLocation
} from './franchise-property-promotion.js';

const property = {
    id: 'property-1',
    company_id: 'company-1',
    manager_id: 'manager-1',
    name: '강남역 물건',
    status: '검토',
    operation_type: '임대',
    address: '서울 강남구 역삼동 1-1',
    created_at: '2026-06-16T00:00:00.000Z',
    updated_at: '2026-06-17T00:00:00.000Z',
    data: {
        region: '서울 강남구',
        detailAddress: '2층',
        area: 34,
        deposit: 5000,
        premium: 1000,
        monthlyRent: 350,
        coordinates: { lat: 37.5, lng: 127.1 },
        featureMemo: '대로변',
        photos: ['hidden-heavy-field']
    }
};

test('buildFranchisePropertyPromotionDraft maps common property fields to franchise location columns', () => {
    const draft = buildFranchisePropertyPromotionDraft(property, 'company-2', 'manager-2');

    assert.equal(draft.company_id, 'company-2');
    assert.equal(draft.manager_id, 'manager-2');
    assert.equal(draft.name, '강남역 물건');
    assert.equal(draft.location_type, '예정점');
    assert.equal(draft.status, '검토중');
    assert.equal(draft.region, '서울 강남구');
    assert.equal(draft.address, '서울 강남구 역삼동 1-1');
    assert.equal(draft.latitude, 37.5);
    assert.equal(draft.longitude, 127.1);
    assert.equal(draft.source_property_id, 'property-1');
});

test('buildFranchisePropertyPromotionDraft keeps property-only fields in memo and snapshot', () => {
    const draft = buildFranchisePropertyPromotionDraft(property, 'company-1');

    assert.match(draft.memo, /^\[물건 등록 원본 정보\]/);
    assert.match(draft.memo, /- 상세 주소: 2층/);
    assert.match(draft.memo, /- 면적: 34/);
    assert.match(draft.memo, /- 특징 메모: 대로변/);
    assert.doesNotMatch(draft.memo, /photos/);
    assert.deepEqual(draft.data.sourcePropertySnapshot, {
        id: 'property-1',
        name: '강남역 물건',
        address: '서울 강남구 역삼동 1-1',
        region: '서울 강남구',
        status: '검토',
        operationType: '임대',
        area: 34,
        desiredBrand: null,
        categoryMajor: null,
        categoryMiddle: null,
        desiredCategory: null,
        privateArea: null,
        supplyArea: null,
        deposit: 5000,
        premium: 1000,
        monthlyRent: 350,
        maintenanceFee: null,
        leaseAvailableDate: null,
        currentStatus: null,
        totalPrice: null,
        createdAt: '2026-06-16T00:00:00.000Z',
        updatedAt: '2026-06-17T00:00:00.000Z'
    });
});

test('buildFranchisePropertyPromotionDraft maps new property registration fields and keeps unmatched fields in memo', () => {
    const draft = buildFranchisePropertyPromotionDraft({
        id: 'property-2',
        company_id: 'company-1',
        manager_id: 'manager-1',
        name: null,
        status: '공실',
        operation_type: '물건등록',
        address: null,
        created_at: '2026-06-17T00:00:00.000Z',
        updated_at: '2026-06-17T01:00:00.000Z',
        data: {
            propertyName: '송파구 대로변 매장',
            propertyAddress: '서울 송파구 올림픽로 99',
            desiredBrand: '미카도',
            desiredBusinessType: '요식업',
            desiredCategory: '커피',
            categoryMajor: '요식업',
            categoryMiddle: '커피',
            detailAddress: '1층',
            privateArea: '42',
            deposit: '5000',
            monthlyRent: '450',
            maintenanceFee: '40',
            fileNames: ['도면.pdf'],
            fileAttachments: [{ name: '도면.pdf', size: 4096, type: 'application/pdf' }],
            rentFreeAvailable: '가능',
            landlordSupportMemo: '간판 협의 가능',
            riskMemo: '권리금 재확인 필요'
        }
    }, 'company-1');

    assert.equal(draft.name, '송파구 대로변 매장');
    assert.equal(draft.brand, '미카도');
    assert.equal(draft.region, '서울 송파구');
    assert.equal(draft.address, '서울 송파구 올림픽로 99');
    assert.match(draft.memo, /- 희망 업종\(중분류\): 커피/);
    assert.match(draft.memo, /- 상세 주소: 1층/);
    assert.match(draft.memo, /- 보증금: 5000/);
    assert.match(draft.memo, /- 렌트프리 가능 여부: 가능/);
    assert.match(draft.memo, /- 리스크 메모: 권리금 재확인 필요/);
    assert.doesNotMatch(draft.memo, /propertyName/);
    assert.doesNotMatch(draft.memo, /첨부 파일/);
    assert.deepEqual(draft.data.fileNames, ['도면.pdf']);
    assert.deepEqual(draft.data.fileAttachments, [{ name: '도면.pdf', size: 4096, type: 'application/pdf' }]);
    assert.equal(draft.data.sourcePropertySnapshot.desiredBrand, '미카도');
    assert.equal(draft.data.sourcePropertySnapshot.categoryMajor, '요식업');
    assert.equal(draft.data.sourcePropertySnapshot.categoryMiddle, '커피');
    assert.equal(draft.data.sourcePropertySnapshot.privateArea, '42');
    assert.deepEqual(draft.data.sourcePropertySnapshot.fileNames, ['도면.pdf']);
});

test('findPromotedSourceLocation detects an existing source property link', () => {
    const linked = findPromotedSourceLocation('property-1', [
        { id: 'location-1', sourcePropertyId: null },
        { id: 'location-2', source_property_id: 'property-1' }
    ]);

    assert.equal(linked?.id, 'location-2');
});
