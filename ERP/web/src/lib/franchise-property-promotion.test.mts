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
        requesterId: '6e00f61d-1d01-407c-8443-e3798f0e6574',
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

    assert.doesNotMatch(draft.memo, /^\[입점 요청 원본 정보\]/);
    assert.match(draft.memo, /- 특징 메모: 대로변/);
    assert.doesNotMatch(draft.memo, /requesterId/);
    assert.doesNotMatch(draft.memo, /6e00f61d-1d01-407c-8443-e3798f0e6574/);
    assert.doesNotMatch(draft.memo, /- 면적: 34/);
    assert.doesNotMatch(draft.memo, /- 상세 주소: 2층/);
    assert.doesNotMatch(draft.memo, /- 보증금:/);
    assert.doesNotMatch(draft.memo, /photos/);
    assert.equal(draft.data.siteCondition.exclusiveAreaPyeong, 34);
    assert.deepEqual(draft.data.cost, {
        deposit: 5000,
        premium: 1000,
        memo: ''
    });
    assert.deepEqual(draft.data.lease, {
        monthlyRent: 350,
        maintenanceFee: null,
        memo: ''
    });
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
        detailAddress: '2층',
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

test('buildFranchisePropertyPromotionDraft maps new property registration fields into location master data', () => {
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
            matchPriority: '브랜드 우선',
            detailAddress: '1층',
            privateArea: '42',
            deposit: '5000',
            monthlyRent: '450',
            maintenanceFee: '40',
            fileNames: ['도면.pdf'],
            fileAttachments: [{ name: '도면.pdf', size: 4096, type: 'application/pdf' }],
            rentFreeAvailable: '가능',
            landlordSupportMemo: '간판 협의 가능',
            consultationMemo: '신규 상권 확인',
            riskMemo: '권리금 재확인 필요'
        }
    }, 'company-1');

    assert.equal(draft.name, '송파구 대로변 매장');
    assert.equal(draft.brand, '미카도');
    assert.equal(draft.region, '서울 송파구');
    assert.equal(draft.address, '서울 송파구 올림픽로 99');
    assert.equal(draft.memo, '- 업태: 요식업\n- 업종: 커피\n- 우선순위: 브랜드 우선\n- 상담 메모: 신규 상권 확인');
    assert.doesNotMatch(draft.memo, /propertyName/);
    assert.doesNotMatch(draft.memo, /첨부 파일/);
    assert.equal(draft.data.addressDetail, '1층');
    assert.deepEqual(draft.data.siteCondition, {
        exclusiveAreaPyeong: 42,
        exclusiveAreaMemo: '전용 42평 / 현상태 공실',
        restroom: { value: '미확인', memo: '' },
        elevator: { value: '미확인', memo: '' },
        demolition: { value: '미확인', memo: '' },
        parking: { value: '미확인', memo: '' }
    });
    assert.deepEqual(draft.data.cost, {
        deposit: 5000,
        premium: null,
        memo: '권리금 재확인 필요'
    });
    assert.deepEqual(draft.data.lease, {
        monthlyRent: 450,
        maintenanceFee: 40,
        memo: '렌트프리 가능 / 기타 지원 간판 협의 가능'
    });
    assert.equal(draft.data.landlord.tendency, '간판 협의 가능');
    assert.equal(draft.data.propertyIntakeDetails.rentFreeAvailable, '가능');
    assert.equal(draft.data.propertyIntakeDetails.consultationMemo, '신규 상권 확인');
    assert.deepEqual(draft.data.fileNames, ['도면.pdf']);
    assert.deepEqual(draft.data.fileAttachments, [{ name: '도면.pdf', size: 4096, type: 'application/pdf' }]);
    assert.equal(draft.data.sourcePropertySnapshot.desiredBrand, '미카도');
    assert.equal(draft.data.sourcePropertySnapshot.categoryMajor, '요식업');
    assert.equal(draft.data.sourcePropertySnapshot.categoryMiddle, '커피');
    assert.equal(draft.data.sourcePropertySnapshot.detailAddress, '1층');
    assert.equal(draft.data.sourcePropertySnapshot.privateArea, '42');
    assert.deepEqual(draft.data.sourcePropertySnapshot.fileNames, ['도면.pdf']);
});

test('buildFranchisePropertyPromotionDraft maps local intake money and area into location master data', () => {
    const draft = buildFranchisePropertyPromotionDraft({
        id: 'property-local-1',
        company_id: 'company-1',
        manager_id: 'manager-1',
        name: '[로컬샘플] 강남역 1층 코너 물건',
        status: '공실',
        operation_type: '물건등록',
        address: '서울 강남구 테헤란로 123',
        created_at: '2026-06-17T00:00:00.000Z',
        updated_at: '2026-06-17T01:00:00.000Z',
        data: {
            propertyRegion: '서울 강남구',
            detailAddress: '1층 코너',
            desiredBrand: '미카도',
            desiredBusinessType: '요식업',
            desiredCategory: '일식',
            categoryMajor: '요식업',
            categoryMiddle: '일식',
            matchPriority: '브랜드 우선',
            privateArea: '92.6',
            privateAreaInput: '28',
            privateAreaUnit: 'pyeong',
            privateAreaSquareMeter: '92.6',
            privateAreaPyeong: '28',
            supplyArea: '',
            floor: '1',
            totalFloors: '5',
            parkingAvailable: '가능',
            currentStatus: '공실',
            deposit: '7000',
            premium: '4500',
            monthlyRent: '520',
            maintenanceFee: '45',
            vatIncluded: '별도',
            leaseAvailableDate: '2026-07-15',
            contractPeriod: '2년',
            negotiable: '가능',
            rentFreeAvailable: '가능',
            rentFreePeriod: '1개월 협의',
            interiorSupportAvailable: '확인 필요',
            simpleInstallSupportAvailable: '가능',
            facilityWorkNegotiable: '가능',
            landlordSupportMemo: '간판 위치와 원상복구 범위 협의 가능',
            consultationMemo: '유동인구가 많은 대로변 샘플 물건',
            riskMemo: '권리금 최종 확인 필요',
            nextAction: '브랜드 제안',
            nextContactAt: '2026-06-20',
            requesterId: '6e00f61d-1d01-407c-8443-e3798f0e6574',
            seedTag: 'local-franchise-intake-sample'
        }
    }, 'company-1');

    assert.equal(draft.data.addressDetail, '1층 코너');
    assert.deepEqual(draft.data.siteCondition, {
        exclusiveAreaPyeong: 28,
        exclusiveAreaMemo: '전용 92.6㎡ / 1층 / 전체 5층 / 현상태 공실 / 주차 가능',
        restroom: { value: '미확인', memo: '' },
        elevator: { value: '미확인', memo: '' },
        demolition: { value: '미확인', memo: '' },
        parking: { value: '있음', memo: '가능' }
    });
    assert.deepEqual(draft.data.cost, {
        deposit: 7000,
        premium: 4500,
        memo: '권리금 최종 확인 필요'
    });
    assert.deepEqual(draft.data.lease, {
        monthlyRent: 520,
        maintenanceFee: 45,
        memo: '부가세 별도 / 임대 가능일 2026-07-15 / 계약 기간 2년 / 협의 가능 / 렌트프리 가능 / 렌트프리 기간 1개월 협의 / 인테리어 지원 확인 필요 / 간판 설치 지원 가능 / 시설 공사 협의 가능 / 기타 지원 간판 위치와 원상복구 범위 협의 가능'
    });
    assert.equal(draft.data.propertyIntakeDetails.rentFreeAvailable, '가능');
    assert.equal(draft.data.propertyIntakeDetails.landlordSupportMemo, '간판 위치와 원상복구 범위 협의 가능');
    assert.equal(draft.data.landlord.tendency, '간판 위치와 원상복구 범위 협의 가능');
    assert.match(draft.memo, /- 업태: 요식업/);
    assert.match(draft.memo, /- 업종: 일식/);
    assert.match(draft.memo, /- 우선순위: 브랜드 우선/);
    assert.match(draft.memo, /- 상담 메모: 유동인구가 많은 대로변 샘플 물건/);
    assert.doesNotMatch(draft.memo, /^\[입점 요청 원본 정보\]/);
    assert.doesNotMatch(draft.memo, /requesterId/);
    assert.doesNotMatch(draft.memo, /6e00f61d-1d01-407c-8443-e3798f0e6574/);
    assert.doesNotMatch(draft.memo, /- 보증금:/);
    assert.doesNotMatch(draft.memo, /- 권리금:/);
    assert.doesNotMatch(draft.memo, /- 월세:/);
    assert.doesNotMatch(draft.memo, /- 관리비:/);
    assert.doesNotMatch(draft.memo, /- 전용면적/);
    assert.doesNotMatch(draft.memo, /- 주차 가능 여부:/);
    assert.doesNotMatch(draft.memo, /seedTag/);
});

test('findPromotedSourceLocation detects an existing source property link', () => {
    const linked = findPromotedSourceLocation('property-1', [
        { id: 'location-1', sourcePropertyId: null },
        { id: 'location-2', source_property_id: 'property-1' }
    ]);

    assert.equal(linked?.id, 'location-2');
});
