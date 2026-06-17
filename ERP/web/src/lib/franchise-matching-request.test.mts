import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    MATCHING_REQUEST_INITIAL_FORM,
    buildMatchingRequestSections,
    buildMatchingRequestPayload,
    type MatchingRequestForm
} from './franchise-matching-request';
import { FRANCHISE_MATCHING_REQUEST_SOURCE } from './franchise-leads';

describe('buildMatchingRequestPayload', () => {
    it('Given the matching request form When building payload Then it stores source and operational fields', () => {
        const form: MatchingRequestForm = {
            ...MATCHING_REQUEST_INITIAL_FORM,
            name: '홍길동',
            mobile: '010-1111-2222',
            email: 'hong@example.com',
            desiredCategory: '음식점',
            desiredBrand: '미카도',
            totalBudget: '12000',
            desiredRegion: '서울 강남구',
            ownedPropertyStatus: '보유',
            ownedPropertyName: '강남역 코너 매장',
            matchPriority: '지역 우선',
            urgency: '높음',
            summaryNote: '빠른 상담 희망',
            riskMemo: '예산 재확인 필요'
        };

        const payload = buildMatchingRequestPayload(form, {
            requesterId: 'manager-1',
            companyName: '미카도'
        });

        assert.equal(payload.source, FRANCHISE_MATCHING_REQUEST_SOURCE);
        assert.equal(payload.sourceType, 'franchise_matching_request');
        assert.equal(payload.name, '홍길동');
        assert.equal(payload.managerId, 'manager-1');
        assert.equal(payload.desiredRegion, '서울 강남구');
        assert.equal(payload.budgetMax, '12000');
        assert.equal(payload.interestedBrand, '미카도');
        assert.equal(payload.email, 'hong@example.com');
        assert.equal(payload.ownedPropertyName, '강남역 코너 매장');
        assert.match(payload.memo, /빠른 상담 희망/);
        assert.match(payload.memo, /예산 재확인 필요/);
    });

    it('Given brand unknown is checked When building payload Then interested brand is saved as undecided', () => {
        const payload = buildMatchingRequestPayload({
            ...MATCHING_REQUEST_INITIAL_FORM,
            name: '김내일',
            mobile: '010-3333-4444',
            desiredCategory: '카페',
            desiredBrand: '입력된 브랜드',
            brandUnknown: true,
            totalBudget: '8000',
            desiredRegion: '서울 송파구',
            ownedPropertyStatus: '미보유'
        }, {
            requesterId: 'manager-1',
            companyName: '미카도'
        });

        assert.equal(payload.interestedBrand, '브랜드 미정');
    });

    it('Given shared industry options When building sections Then desired category uses them', () => {
        const sections = buildMatchingRequestSections(['', '라멘', '수제버거']);
        const categoryField = sections
            .flatMap(section => section.fields)
            .find(field => field.key === 'desiredCategory');

        assert.deepEqual(categoryField?.options, ['', '라멘', '수제버거']);
    });
});
