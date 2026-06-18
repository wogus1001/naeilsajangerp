import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildLeadExportColumns,
    buildLeadExportRows,
    buildLocationExportColumns,
    buildLocationExportRows,
    buildOperationExportColumns,
    buildOperationExportRows
} from './franchiseDbExport.js';
import type { FranchiseLead } from './leads/types.js';
import type { FranchiseLocation as CandidateLocation } from './market-insights/locationMasterTypes.js';
import type { FranchiseLocation as OperationLocation } from './operations/types.js';

test('Given visible lead columns include actions When building export columns Then action columns are excluded', () => {
    const columns = buildLeadExportColumns(['name', 'mobile', 'actions', 'manager']);
    const rows = buildLeadExportRows([
        {
            id: 'lead-1',
            name: '김희망',
            mobile: '010-0000-0000',
            source: 'Meta',
            status: '문의접수',
            grade: 'HOT',
            desiredRegion: '서울 강남구',
            budgetMin: 100000000,
            budgetMax: 150000000,
            interestedBrand: '미카도',
            memo: '상담 메모',
            nextContactAt: null,
            lastContactedAt: null,
            createdAt: '2026-06-18T00:00:00.000Z',
            updatedAt: '2026-06-18T00:00:00.000Z',
            managerId: 'manager-1'
        } satisfies FranchiseLead
    ], columns, managerId => managerId === 'manager-1' ? '협력업체-김재현' : '-');

    assert.deepEqual(columns.map(column => column.label), ['가맹 희망자', '연락처', '담당자']);
    assert.equal(rows[0]?.name, '김희망');
    assert.equal(rows[0]?.manager, '협력업체-김재현');
    assert.equal('actions' in (rows[0] || {}), false);
});

test('Given candidate locations When building export rows Then matched columns use candidate data and full memo text', () => {
    const columns = buildLocationExportColumns(['name', 'deposit', 'premium', 'monthlyRent', 'memo', 'actions']);
    const location = {
        id: 'location-1',
        name: '강남역 1층 코너',
        locationType: '예정점',
        brand: '미카도',
        status: '검토중',
        region: '서울 강남구',
        address: '서울 강남구 테헤란로 123',
        addressDetail: '1층 코너',
        latitude: null,
        longitude: null,
        openedAt: null,
        sourcePropertyId: 'property-1',
        memo: '[물건 등록 원본 정보] 보증금 7000 권리금 4500',
        createdAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:00:00.000Z',
        developmentStage: '개발중',
        importance: '보통',
        fileNames: [],
        fileAttachments: [],
        siteCondition: {
            exclusiveAreaPyeong: 28,
            exclusiveAreaMemo: '',
            restroom: { value: '미확인', memo: '' },
            elevator: { value: '미확인', memo: '' },
            demolition: { value: '미확인', memo: '' },
            parking: { value: '있음', memo: '' }
        },
        landlord: { name: '', phone: '', tendency: '협조적' },
        cost: { deposit: 7000, premium: 4500, memo: '' },
        lease: { monthlyRent: 520, maintenanceFee: 45, memo: '' }
    } satisfies CandidateLocation;

    const rows = buildLocationExportRows([location], columns, () => '김스트');

    assert.deepEqual(columns.map(column => column.label), ['후보지명', '보증금', '권리금', '월세', '종합메모']);
    assert.equal(rows[0]?.deposit, '7,000만원');
    assert.equal(rows[0]?.premium, '4,500만원');
    assert.equal(rows[0]?.monthlyRent, '520만원');
    assert.equal(rows[0]?.memo, '[물건 등록 원본 정보] 보증금 7000 권리금 4500');
});

test('Given operational locations When building export rows Then fixed operational columns are produced', () => {
    const columns = buildOperationExportColumns();
    const rows = buildOperationExportRows([
        {
            id: 'operation-1',
            name: '강남점',
            locationType: '가맹점',
            brand: '미카도',
            status: '운영중',
            region: '서울 강남구',
            address: '서울 강남구 테헤란로 1',
            latitude: null,
            longitude: null,
            openedAt: '2026-06-01T00:00:00.000Z',
            memo: '운영 메모',
            competitionKeyword: '일식',
            competitionScan: {
                query: '일식',
                radius: 700,
                scannedAt: '2026-06-18T03:00:00.000Z',
                totalCount: 12,
                competitors: []
            }
        } satisfies OperationLocation
    ]);

    assert.deepEqual(columns.map(column => column.label).slice(0, 4), ['점포명', '브랜드', '상태', '구분']);
    assert.equal(rows[0]?.competitionCount, '12');
    assert.equal(rows[0]?.memo, '운영 메모');
});
