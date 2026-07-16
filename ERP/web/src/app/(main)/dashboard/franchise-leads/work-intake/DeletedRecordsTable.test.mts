import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readPropertyAreaUnit } from '../../../../../lib/franchise-property-registration-format.js';
import { buildDeletedRecordEditTarget } from './deleted-record-edit-target.js';
import { buildDeletedRecordDetails } from './deleted-record-details.js';
import type { DeletedWorkIntakeItem } from './types.js';
import { withCurrentSelectOption } from './work-intake-select-options.js';

function toDetailMap(details: readonly (readonly [string, string])[]): Map<string, string> {
    return new Map(details.map(([label, value]) => [label, value]));
}

test('Given an archived select value missing from current options Then the original value remains visible', () => {
    assert.deepEqual(withCurrentSelectOption(['선택', '현재값'], '과거값'), ['선택', '현재값', '과거값']);
    assert.deepEqual(withCurrentSelectOption(['선택', '현재값'], '현재값'), ['선택', '현재값']);
});

test('Given a deleted property snapshot When building details Then key intake fields are shown', () => {
    const record: DeletedWorkIntakeItem = {
        id: 'deleted-1',
        kind: 'properties',
        kindLabel: '입점 요청',
        sourceId: 'property-1',
        companyId: 'company-1',
        companyName: '내일',
        deletedBy: 'admin-1',
        deletedByName: '관리자',
        title: '삭제된 매물',
        summary: '서울 강남구',
        deletedAt: '2026-07-16T00:00:00.000Z',
        snapshot: {
            sourceTable: 'properties',
            row: {
                name: '삭제된 매물',
                status: '공실',
                address: '서울 강남구',
                created_at: '2026-07-15T12:30:00.000Z',
                data: {
                    detailAddress: '테헤란로 123',
                    desiredBrand: '민티아',
                    desiredBusinessType: '카페',
                    desiredCategory: '분식',
                    deposit: '7000',
                    monthlyRent: '520',
                    consultationMemo: '상담 메모'
                }
            }
        }
    };

    const details = toDetailMap(buildDeletedRecordDetails(record));

    assert.equal(details.get('물건명'), '삭제된 매물');
    assert.equal(details.get('주소'), '서울 강남구 / 테헤란로 123');
    assert.equal(details.get('희망 조건'), '민티아 / 카페 / 분식');
    assert.equal(details.get('임대 조건'), '보증금 7000만원 / 월세 520만원');
    assert.equal(details.get('상담 메모'), '상담 메모');
    assert.equal(details.get('원본 테이블'), 'properties');
});

test('Given a deleted property snapshot When rebuilding the read-only target Then every registration section is restored', () => {
    const record: DeletedWorkIntakeItem = {
        id: 'deleted-property-full',
        kind: 'properties',
        kindLabel: '입점 요청',
        sourceId: 'property-full',
        companyId: 'company-1',
        companyName: '내일',
        deletedBy: 'admin-1',
        deletedByName: '관리자',
        title: '전체 필드 매물',
        summary: '서울 강남구',
        deletedAt: '2026-07-16T00:00:00.000Z',
        snapshot: {
            sourceTable: 'properties',
            row: {
                id: 'property-full',
                manager_id: 'manager-1',
                name: '전체 필드 매물',
                status: '영업중',
                address: '서울 강남구',
                created_at: '2026-07-15T12:30:00.000Z',
                data: {
                    desiredBrand: '민티아',
                    desiredBusinessType: '서비스업',
                    desiredCategory: '세탁',
                    matchPriority: '높음',
                    operatingStoreName: '기존 매장',
                    propertyAddress: '서울 강남구 테헤란로 1',
                    detailAddress: '101호',
                    roadAddress: '서울 강남구 테헤란로 1',
                    jibunAddress: '서울 강남구 역삼동 1',
                    zoneNo: '06100',
                    privateAreaInput: '33.5',
                    privateAreaUnit: '평',
                    supplyArea: '45',
                    floor: '1',
                    totalFloors: '5',
                    parkingAvailable: '가능',
                    deposit: '7000',
                    monthlyRent: '520',
                    maintenanceFee: '50',
                    premium: '1200',
                    vatIncluded: '별도',
                    leaseAvailableDate: '2026-08-01',
                    contractPeriod: '2년',
                    negotiable: '가능',
                    rentFreeAvailable: '가능',
                    rentFreePeriod: '1개월',
                    interiorSupportAvailable: '가능',
                    simpleInstallSupportAvailable: '불가',
                    facilityWorkNegotiable: '가능',
                    landlordSupportMemo: '간판 협의',
                    consultationMemo: '상담 메모',
                    riskMemo: '리스크 메모',
                    nextAction: '임대인 재통화',
                    nextContactAt: '2026-07-20T09:00',
                    fileAttachments: [{ id: 'file-1', name: '매장.jpg', url: 'https://example.com/store.jpg', size: 1024, type: 'image/jpeg' }]
                }
            }
        }
    };

    const target = buildDeletedRecordEditTarget(record);
    assert.ok(target && target.kind === 'properties');
    assert.equal(target.item.form.operatingStoreName, '기존 매장');
    assert.equal(target.item.form.privateArea, '33.5');
    assert.equal(readPropertyAreaUnit(target.item.form.privateAreaUnit), 'pyeong');
    assert.equal(target.item.form.parkingAvailable, '가능');
    assert.equal(target.item.form.premium, '1200');
    assert.equal(target.item.form.rentFreePeriod, '1개월');
    assert.equal(target.item.form.landlordSupportMemo, '간판 협의');
    assert.equal(target.item.form.nextContactAt, '2026-07-20T09:00');
    assert.equal(target.item.form.fileAttachments[0]?.name, '매장.jpg');
});

test('Given a deleted attachment with an arbitrary public URL Then the archived URL is not trusted', () => {
    const record: DeletedWorkIntakeItem = {
        id: 'deleted-property-untrusted-file',
        kind: 'properties',
        kindLabel: '입점 요청',
        sourceId: 'property-file',
        companyId: 'company-1',
        companyName: '내일',
        deletedBy: 'admin-1',
        deletedByName: '관리자',
        title: '첨부 보안 확인',
        summary: '',
        deletedAt: '2026-07-16T00:00:00.000Z',
        snapshot: {
            sourceTable: 'properties',
            row: {
                name: '첨부 보안 확인',
                data: {
                    fileAttachments: [{
                        name: '외부.png',
                        size: 1024,
                        type: 'image/png',
                        publicUrl: 'https://untrusted.example/track.png'
                    }]
                }
            }
        }
    };

    const target = buildDeletedRecordEditTarget(record);
    assert.ok(target && target.kind === 'properties');
    assert.equal(target.item.form.fileAttachments[0]?.name, '외부.png');
    assert.equal(target.item.form.fileAttachments[0]?.publicUrl, undefined);
});

test('Given a deleted attachment with path traversal Then no public URL is rebuilt', () => {
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    const record = {
        id: 'deleted-traversal',
        kind: 'properties',
        kindLabel: '입점 요청',
        sourceId: 'property-traversal',
        companyId: 'company-1',
        companyName: '내일',
        deletedBy: 'admin-1',
        deletedByName: '관리자',
        title: '경로 검증',
        summary: '',
        deletedAt: '2026-07-16T00:00:00.000Z',
        snapshot: {
            row: {
                data: {
                    fileAttachments: [{
                        name: 'secret.pdf',
                        storageBucket: 'property-documents',
                        storagePath: 'properties/property-traversal/../../secret.pdf',
                        publicUrl: 'https://example.supabase.co/storage/v1/object/public/property-documents/secret.pdf'
                    }]
                }
            }
        }
    } satisfies DeletedWorkIntakeItem;

    const target = buildDeletedRecordEditTarget(record);
    assert.equal(target?.kind, 'properties');
    if (target?.kind === 'properties') {
        assert.equal(target.item.form.fileAttachments[0]?.publicUrl, undefined);
    }
    if (previousUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }
});

test('Given a legacy lead status Then the archived value remains available for display', () => {
    const record = {
        id: 'deleted-legacy-status',
        kind: 'leadRegistrations',
        kindLabel: '가맹 희망자 등록',
        sourceId: 'lead-legacy-status',
        companyId: 'company-1',
        companyName: '내일',
        deletedBy: 'admin-1',
        deletedByName: '관리자',
        title: '과거 상태 고객',
        summary: '',
        deletedAt: '2026-07-16T00:00:00.000Z',
        snapshot: { row: { name: '과거 상태 고객', status: '연락완료' } }
    } satisfies DeletedWorkIntakeItem;

    const target = buildDeletedRecordEditTarget(record);
    assert.equal(target?.kind, 'leadRegistrations');
    if (target?.kind === 'leadRegistrations') {
        assert.equal(target.item.archivedStatus, '연락완료');
    }
});

test('Given multiline archived notes When rebuilding a target Then line breaks remain intact', () => {
    const record: DeletedWorkIntakeItem = {
        id: 'deleted-property-multiline',
        kind: 'properties',
        kindLabel: '입점 요청',
        sourceId: 'property-multiline',
        companyId: 'company-1',
        companyName: '내일',
        deletedBy: 'admin-1',
        deletedByName: '관리자',
        title: '여러 줄 메모',
        summary: '',
        deletedAt: '2026-07-16T00:00:00.000Z',
        snapshot: {
            sourceTable: 'properties',
            row: {
                name: '여러 줄 메모',
                data: { consultationMemo: '첫 번째 줄\n\n두 번째 줄' }
            }
        }
    };

    const target = buildDeletedRecordEditTarget(record);
    assert.ok(target && target.kind === 'properties');
    assert.equal(target.item.form.consultationMemo, '첫 번째 줄\n\n두 번째 줄');
});

test('Given a deleted matching request snapshot When building details Then customer fields are shown', () => {
    const record: DeletedWorkIntakeItem = {
        id: 'deleted-2',
        kind: 'matchingRequests',
        kindLabel: '예비 창업자 등록',
        sourceId: 'matching-1',
        companyId: 'company-1',
        companyName: '내일',
        deletedBy: 'admin-1',
        deletedByName: '관리자',
        title: '홍길동',
        summary: '서울',
        deletedAt: '2026-07-16T00:00:00.000Z',
        snapshot: {
            sourceTable: 'matching_requests',
            row: {
                name: '홍길동',
                mobile: '010-0000-0000',
                desired_region: '서울 마포구',
                budget_min: 5000,
                budget_max: 8000,
                memo: '창업 상담 필요',
                data: {
                    desiredCategory: '음료',
                    interestedBrand: '샘플브랜드',
                    email: 'sample@example.com'
                }
            }
        }
    };

    const details = toDetailMap(buildDeletedRecordDetails(record));

    assert.equal(details.get('이름'), '홍길동');
    assert.equal(details.get('연락처'), '010-0000-0000');
    assert.equal(details.get('이메일'), 'sample@example.com');
    assert.equal(details.get('희망 지역'), '서울 마포구');
    assert.equal(details.get('희망 조건'), '음료 / 샘플브랜드');
    assert.equal(details.get('예산'), '최소 5000 / 최대 8000');
    assert.equal(details.get('메모'), '창업 상담 필요');
});

test('Given a deleted lead registration snapshot When rebuilding the read-only target Then follow-up fields are restored', () => {
    const record: DeletedWorkIntakeItem = {
        id: 'deleted-lead-full',
        kind: 'leadRegistrations',
        kindLabel: '예비 창업자 등록',
        sourceId: 'lead-full',
        companyId: 'company-1',
        companyName: '내일',
        deletedBy: 'admin-1',
        deletedByName: '관리자',
        title: '김예비',
        summary: '서울 송파구',
        deletedAt: '2026-07-16T00:00:00.000Z',
        snapshot: {
            sourceTable: 'franchise_lead_registration_requests',
            row: {
                id: 'lead-full',
                manager_id: 'manager-1',
                created_by: 'author-1',
                name: '김예비',
                mobile: '010-1234-5678',
                source: '홈페이지',
                status: '상담중',
                grade: 'A',
                desired_region: '서울 송파구',
                interested_brand: '민티아',
                budget_min: 100_000_000,
                budget_max: 200_000_000,
                memo: '오후 통화 희망',
                next_contact_at: '2026-07-20T01:30:00.000Z',
                created_at: '2026-07-15T12:30:00.000Z',
                data: { registrationSource: '홈페이지' }
            }
        }
    };

    const target = buildDeletedRecordEditTarget(record);
    assert.ok(target && target.kind === 'leadRegistrations');
    assert.equal(target.item.form.name, '김예비');
    assert.equal(target.item.form.mobile, '010-1234-5678');
    assert.equal(target.item.form.source, '홈페이지');
    assert.equal(target.item.form.desiredRegion, '서울 송파구');
    assert.equal(target.item.form.budgetMin, '10000');
    assert.equal(target.item.form.budgetMax, '20000');
    assert.equal(target.item.form.interestedBrand, '민티아');
    assert.equal(target.item.form.memo, '오후 통화 희망');
    assert.match(target.item.form.nextContactAt, /^2026-07-20T\d{2}:30$/);
});

test('Given a deleted matching request snapshot When rebuilding the read-only target Then all consultation sections are restored', () => {
    const record: DeletedWorkIntakeItem = {
        id: 'deleted-matching-full',
        kind: 'matchingRequests',
        kindLabel: '예비 창업자 등록',
        sourceId: 'matching-full',
        companyId: 'company-1',
        companyName: '내일',
        deletedBy: 'admin-1',
        deletedByName: '관리자',
        title: '홍길동',
        summary: '서울 마포구',
        deletedAt: '2026-07-16T00:00:00.000Z',
        snapshot: {
            sourceTable: 'franchise_leads',
            row: {
                id: 'matching-full',
                manager_id: 'manager-1',
                created_by: 'author-1',
                name: '홍길동',
                mobile: '010-0000-0000',
                status: '상담중',
                desired_region: '서울 마포구',
                interested_brand: '민티아',
                memo: '기존 메모',
                created_at: '2026-07-15T12:30:00.000Z',
                data: {
                    email: 'sample@example.com',
                    residence: '서울',
                    currentJob: '회사원',
                    startupExperience: '없음',
                    decisionMaker: '본인',
                    startupTiming: '3개월 이내',
                    desiredCategory: '커피',
                    brandPreference: '가맹',
                    totalBudget: '15000',
                    ownCapital: '8000',
                    loanPreference: '가능',
                    desiredDeposit: '5000',
                    desiredRent: '400',
                    desiredPremium: '1000',
                    desiredSize: '30평',
                    desiredFloor: '1층',
                    excludedRegion: '강북구',
                    ownedPropertyStatus: '보유',
                    ownedPropertyName: '보유 상가',
                    ownedPropertyAddress: '서울 마포구',
                    ownedPropertyAddressDetail: '201호',
                    ownedArea: '20평',
                    ownedFloor: '2층',
                    ownedDeposit: '3000',
                    ownedRent: '250',
                    ownedMaintenance: '30',
                    ownedPremium: '500',
                    ownedCurrentStatus: '공실',
                    ownerAgreement: '완료',
                    ownedDescription: '즉시 입점 가능',
                    matchPriority: '높음',
                    proposalRange: '서울 전역',
                    urgency: '긴급',
                    extraRequest: '주차 필요',
                    summaryNote: '요약',
                    riskMemo: '대출 확인',
                    recommendedBrands: '민티아',
                    recommendedProperties: '마포 상가',
                    nextAction: '현장 미팅'
                }
            }
        }
    };

    const target = buildDeletedRecordEditTarget(record);
    assert.ok(target && target.kind === 'matchingRequests');
    assert.equal(target.item.form.currentJob, '회사원');
    assert.equal(target.item.form.totalBudget, '15000');
    assert.equal(target.item.form.ownedPropertyName, '보유 상가');
    assert.equal(target.item.form.ownedDescription, '즉시 입점 가능');
    assert.equal(target.item.form.extraRequest, '주차 필요');
    assert.equal(target.item.form.recommendedProperties, '마포 상가');
    assert.equal(target.item.form.nextAction, '현장 미팅');
});
