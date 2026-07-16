import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDeletedRecordDetails } from './deleted-record-details.js';
import type { DeletedWorkIntakeItem } from './types.js';

function toDetailMap(details: readonly (readonly [string, string])[]): Map<string, string> {
    return new Map(details.map(([label, value]) => [label, value]));
}

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
