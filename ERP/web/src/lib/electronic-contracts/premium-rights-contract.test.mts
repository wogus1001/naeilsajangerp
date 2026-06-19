import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPremiumRightsUcansignPayload, type PremiumRightsContractInput } from './premium-rights-contract.js';

const input: PremiumRightsContractInput = {
    companyId: 'company-1',
    companyName: '민티아',
    sentByProfileId: 'profile-1',
    sentByName: '김담당',
    ucansignTemplateId: 'template-1',
    businessName: '강남역 1층 코너',
    propertyAddress: '서울 강남구 테헤란로 123',
    businessType: '일식',
    licenseNumber: 'LC-100',
    leaseArea: '30',
    exclusiveArea: '28',
    leaseDepositAmount: '70000000',
    monthlyRentAmount: '5200000',
    managementFeeAmount: '450000',
    vatIncluded: '별도',
    leaseStartDate: '2026-07-01',
    leaseEndDate: '2028-06-30',
    leaseTermMonths: '24',
    totalPremiumAmount: '150000000',
    downPaymentAmount: '15000000',
    interimPaymentAmount: '30000000',
    interimPaymentDate: '2026-06-20',
    balancePaymentAmount: '105000000',
    balancePaymentDate: '2026-06-30',
    tangibleAssets: '집기',
    intangibleAssets: '영업권',
    specialTerm1: '특약',
    specialTerm2: '',
    specialTerm3: '',
    specialTerm4: '',
    contractDate: '2026-06-18',
    transferor: { name: '양도인', contact: 'transferor@example.com', address: '서울' },
    transferee: { name: '양수인', contact: '01012345678', address: '부산' }
};

function fieldValue(payload: ReturnType<typeof buildPremiumRightsUcansignPayload>, fieldName: string): string | boolean {
    const field = payload.fields.find(item => item.fieldName === fieldName);
    return field?.value ?? '';
}

test('Given premium rights input When building payload Then numeric and Korean amount fields are separated', () => {
    const payload = buildPremiumRightsUcansignPayload(input, 'contract-1');

    assert.equal(payload.templateId, 'template-1');
    assert.equal(payload.customValue, 'contract-1');
    assert.equal(fieldValue(payload, 'totalPremiumAmount'), '150,000,000');
    assert.equal(fieldValue(payload, 'totalPremiumText'), '일억오천만원');
    assert.equal(fieldValue(payload, 'licenseNumber'), 'LC-100');
});

test('Given signer contact info When building payload Then email and kakao signing methods are inferred', () => {
    const payload = buildPremiumRightsUcansignPayload(input, 'contract-1');

    assert.equal(payload.participants[0]?.signingMethodType, 'email');
    assert.equal(payload.participants[1]?.signingMethodType, 'kakao');
    assert.equal(payload.participants[0]?.signingOrder, 1);
    assert.equal(payload.participants[1]?.signingOrder, 2);
});
