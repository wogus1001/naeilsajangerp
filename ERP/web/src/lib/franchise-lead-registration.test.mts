import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    LEAD_REGISTRATION_INITIAL_FORM,
    buildLeadRegistrationPayload,
    buildLeadRegistrationPromotionData,
    parseManwonInputToWon
} from './franchise-lead-registration.js';
import { FRANCHISE_LEAD_REGISTRATION_SOURCE } from './franchise-leads.js';

test('Given a lead registration form When building payload Then it targets a separate admin-reviewed request', () => {
    const payload = buildLeadRegistrationPayload({
        ...LEAD_REGISTRATION_INITIAL_FORM,
        name: '홍길동',
        mobile: '010-1111-2222',
        source: '박람회',
        desiredRegion: '서울 강남구',
        budgetMin: '10,000',
        budgetMax: '20,000',
        interestedBrand: '미카도',
        memo: '빠른 상담 희망'
    }, {
        requesterId: 'manager-1',
        companyName: '민티아'
    });

    assert.equal(payload.source, '박람회');
    assert.equal(payload.requestSourceType, 'franchise_lead_registration');
    assert.equal(payload.registrationSource, '박람회');
    assert.equal(payload.budgetMin, 100000000);
    assert.equal(payload.budgetMax, 200000000);
});

test('Given no selected source When building payload Then registration source is used as fallback', () => {
    const payload = buildLeadRegistrationPayload({
        ...LEAD_REGISTRATION_INITIAL_FORM,
        name: '김내일'
    }, {
        requesterId: 'manager-1',
        companyName: '민티아'
    });

    assert.equal(payload.source, FRANCHISE_LEAD_REGISTRATION_SOURCE);
});

test('Given admin promotion context When building data Then raw intake becomes candidate without auto activity log', () => {
    const data = buildLeadRegistrationPromotionData({
        leadStage: 'raw_intake',
        sourceType: 'franchise_lead_registration',
        activityLog: [{ id: 'old', type: '메모' }]
    }, {
        promotedAt: '2026-06-17T00:00:00.000Z',
        promotedBy: 'admin-1',
        requestId: 'request-1'
    });

    assert.equal(data.leadStage, 'candidate');
    assert.equal(data.leadRegistrationRequestId, 'request-1');
    assert.equal(data.adminIntakeStatus, 'promoted');
    assert.equal(data.intakePromotedBy, 'admin-1');
    assert.deepEqual(data.activityLog, [{ id: 'old', type: '메모' }]);
    assert.doesNotMatch(JSON.stringify(data.activityLog), /밀어넣기/);
});

test('Given manwon text When parsing Then it converts to won', () => {
    assert.equal(parseManwonInputToWon('12,345'), 123450000);
    assert.equal(parseManwonInputToWon(''), null);
    assert.equal(parseManwonInputToWon('abc'), null);
});
