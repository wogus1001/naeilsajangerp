import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    createPremiumRightsDraftName,
    createPremiumRightsFormSnapshot,
    parsePremiumRightsDraftForm,
    toPremiumRightsContractInput
} from './premium-rights-draft.js';

test('Given partial draft body When parsing draft form Then missing fields stay saveable', () => {
    const form = parsePremiumRightsDraftForm({
        businessName: '강남점',
        transferor: { name: '양도인' }
    }, '민티아');

    assert.equal(form.companyName, '민티아');
    assert.equal(form.businessName, '강남점');
    assert.equal(form.vatIncluded, '별도');
    assert.equal(form.transferor.name, '양도인');
    assert.equal(form.transferee.contact, '');
});

test('Given draft form When creating snapshot Then list display fields are included', () => {
    const form = parsePremiumRightsDraftForm({
        businessName: '강남점',
        propertyAddress: '서울 강남구',
        transferor: { name: '양도인' },
        transferee: { name: '양수인' }
    }, '민티아');

    const snapshot = createPremiumRightsFormSnapshot(form);

    assert.equal(createPremiumRightsDraftName(form), '[초안] 권리금계약서 - 강남점');
    assert.equal(snapshot.transferorName, '양도인');
    assert.equal(snapshot.transfereeName, '양수인');
});

test('Given draft form and sender meta When converting to send input Then company and sender are attached', () => {
    const form = parsePremiumRightsDraftForm({ businessName: '강남점' }, '민티아');

    const input = toPremiumRightsContractInput(form, {
        companyId: 'company-1',
        sentByProfileId: 'profile-1',
        sentByName: '김담당',
        ucansignTemplateId: 'template-1'
    });

    assert.equal(input.companyId, 'company-1');
    assert.equal(input.sentByName, '김담당');
    assert.equal(input.ucansignTemplateId, 'template-1');
    assert.equal(input.businessName, '강남점');
});
