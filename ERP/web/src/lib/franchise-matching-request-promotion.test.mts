import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildFranchiseMatchingRequestPromotionDraft,
    shouldUseSourceLeadForSameCompanyPromotion
} from './franchise-matching-request-promotion.js';
import {
    buildMatchingRequestSourcePromotionData,
    findMatchingRequestPromotion
} from './franchise-matching-request-promotion-links.js';
import { FRANCHISE_MATCHING_REQUEST_SOURCE, FRANCHISE_MATCHING_REQUEST_SOURCE_LABEL } from './franchise-leads.js';

const source = {
    id: 'matching-1',
    company_id: 'source-company',
    manager_id: 'source-manager',
    name: '박매칭',
    mobile: '010-8800-1001',
    mobile_normalized: '01088001001',
    source: FRANCHISE_MATCHING_REQUEST_SOURCE,
    status: '문의접수',
    grade: '',
    desired_region: '서울 강남구',
    interested_brand: '미카도',
    budget_min: null,
    budget_max: 150_000_000,
    memo: '강남권 일식 브랜드 우선 검토',
    next_contact_at: null,
    created_at: '2026-06-17T00:00:00.000Z',
    updated_at: '2026-06-17T01:00:00.000Z',
    data: {
        email: 'sample-matching@example.com',
        residence: '서울 강남구',
        currentJob: '회사원',
        desiredCategory: '일식',
        totalBudget: '15000',
        ownCapital: '6750',
        desiredDeposit: '5000',
        desiredRent: '450',
        desiredPremium: '3000',
        desiredSize: '25',
        desiredFloor: '1',
        ownedPropertyStatus: '미보유',
        matchPriority: '브랜드 우선',
        proposalRange: '유사 업종 가능',
        urgency: '즉시 상담 필요',
        summaryNote: '예산 증빙 확인 필요',
        recommendedProperties: '강남권 후보지 리드 연결 검토'
    }
};

test('buildFranchiseMatchingRequestPromotionDraft maps compatible fields to lead columns', () => {
    const draft = buildFranchiseMatchingRequestPromotionDraft(source, 'target-company', 'target-manager', '2026-06-17T02:00:00.000Z');

    assert.equal(draft.company_id, 'target-company');
    assert.equal(draft.manager_id, 'target-manager');
    assert.equal(draft.name, '박매칭');
    assert.equal(draft.mobile_normalized, '01088001001');
    assert.equal(draft.source, FRANCHISE_MATCHING_REQUEST_SOURCE_LABEL);
    assert.equal(draft.status, '문의접수');
    assert.equal(draft.grade, 'HOT');
    assert.equal(draft.desired_region, '서울 강남구');
    assert.equal(draft.budget_max, 150_000_000);
    assert.equal(draft.interested_brand, '미카도');
    assert.equal(draft.data.leadStage, 'raw_intake');
    assert.equal(draft.data.sourceType, 'franchise_matching_request_promoted');
    assert.equal(draft.data.matchingRequestId, 'matching-1');
    assert.equal(Object.prototype.hasOwnProperty.call(draft.data, 'activityLog'), false);
});

test('buildFranchiseMatchingRequestPromotionDraft keeps request-only fields in memo and snapshot', () => {
    const draft = buildFranchiseMatchingRequestPromotionDraft(source, 'target-company', null, '2026-06-17T02:00:00.000Z');

    assert.match(draft.memo, /^강남권 일식 브랜드 우선 검토/);
    assert.match(draft.memo, /\[예비 창업자 등록 원본 정보\]/);
    assert.match(draft.memo, /- 이메일: sample-matching@example.com/);
    assert.match(draft.memo, /- 희망 업종: 일식/);
    assert.match(draft.memo, /- 보유 물건: 미보유/);
    assert.match(draft.memo, /- 추천 물건 후보: 강남권 후보지 리드 연결 검토/);
    assert.deepEqual(draft.data.matchingRequestSourceSnapshot, {
        id: 'matching-1',
        companyId: 'source-company',
        managerId: 'source-manager',
        name: '박매칭',
        mobile: '010-8800-1001',
        source: FRANCHISE_MATCHING_REQUEST_SOURCE,
        status: '문의접수',
        grade: '',
        desiredRegion: '서울 강남구',
        desiredCategory: '일식',
        interestedBrand: '미카도',
        budgetMin: null,
        budgetMax: 150_000_000,
        totalBudget: '15000',
        memo: '강남권 일식 브랜드 우선 검토',
        createdAt: '2026-06-17T00:00:00.000Z',
        updatedAt: '2026-06-17T01:00:00.000Z'
    });
});

test('buildMatchingRequestSourcePromotionData stores promoted lead tracking fields', () => {
    const data = buildMatchingRequestSourcePromotionData({ sourceType: 'franchise_matching_request' }, {
        promotedAt: '2026-06-17T02:00:00.000Z',
        promotedBy: 'admin-1',
        promotedLeadId: 'lead-1',
        targetCompanyId: 'company-2',
        targetManagerId: null
    });

    assert.equal(data.sourceType, 'franchise_matching_request');
    assert.equal(data.matchingRequestPromotedLeadId, 'lead-1');
    assert.equal(data.matchingRequestPromotedCompanyId, 'company-2');
    assert.equal(data.matchingRequestPromotedManagerId, '');
    assert.equal(data.matchingRequestPromotionStatus, 'promoted');
});

test('Given multiple target companies When storing matching promotions Then each target keeps its own promoted lead link', () => {
    const first = buildMatchingRequestSourcePromotionData({ sourceType: 'franchise_matching_request' }, {
        promotedAt: '2026-06-17T02:00:00.000Z',
        promotedBy: 'admin-1',
        promotedLeadId: 'lead-1',
        targetCompanyId: 'company-1',
        targetManagerId: 'manager-1'
    });
    const second = buildMatchingRequestSourcePromotionData(first, {
        promotedAt: '2026-06-17T03:00:00.000Z',
        promotedBy: 'admin-2',
        promotedLeadId: 'lead-2',
        targetCompanyId: 'company-2',
        targetManagerId: null
    });

    assert.equal(findMatchingRequestPromotion(second, 'company-1')?.promotedLeadId, 'lead-1');
    assert.equal(findMatchingRequestPromotion(second, 'company-2')?.promotedLeadId, 'lead-2');
    assert.equal(findMatchingRequestPromotion(second, null)?.promotedLeadId, 'lead-2');
    assert.equal(second.matchingRequestPromotedLeadId, 'lead-2');
    assert.equal(second.matchingRequestPromotedCompanyId, 'company-2');
});

test('Given target company is the request company When promoting Then the source lead should be reused', () => {
    assert.equal(shouldUseSourceLeadForSameCompanyPromotion(source, 'source-company'), true);
    assert.equal(shouldUseSourceLeadForSameCompanyPromotion(source, 'target-company'), false);
});
