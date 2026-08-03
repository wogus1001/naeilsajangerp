import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLeadSubmitPayload } from './leadSubmitPayload';
import type { LeadFormState } from './types';

const BASE_FORM: LeadFormState = {
    name: '신규 유입',
    mobile: '010-1234-5678',
    source: '전화문의',
    status: '문의접수',
    grade: '',
    desiredRegion: '서울특별시 강남구',
    budgetMin: '10000',
    budgetMax: '20000',
    interestedBrand: '미카도',
    managerId: '',
    nextContactAt: '',
    memo: ''
};

test('Given 1차 유입 DB 선택 When 신규 등록 요청을 만들면 Then raw_intake 단계가 전송된다', () => {
    // Given
    const leadDbLayer = 'raw_intake';

    // When
    const payload = buildLeadSubmitPayload({
        form: BASE_FORM,
        requesterId: 'manager-1',
        companyName: '테스트',
        leadDbLayer
    });

    // Then
    assert.equal(payload.leadStage, 'raw_intake');
});

test('Given 가맹 희망자 DB 선택 When 신규 등록 요청을 만들면 Then candidate 단계가 전송된다', () => {
    // Given
    const leadDbLayer = 'candidate';

    // When
    const payload = buildLeadSubmitPayload({
        form: BASE_FORM,
        requesterId: 'manager-1',
        companyName: '테스트',
        leadDbLayer
    });

    // Then
    assert.equal(payload.leadStage, 'candidate');
});

test('Given 기존 DB 수정 When 저장 요청을 만들면 Then 기존 단계를 덮어쓰지 않는다', () => {
    // Given
    const form = { ...BASE_FORM, id: 'lead-1' };

    // When
    const payload = buildLeadSubmitPayload({
        form,
        requesterId: 'manager-1',
        companyName: '테스트',
        leadDbLayer: 'raw_intake'
    });

    // Then
    assert.equal('leadStage' in payload, false);
});
