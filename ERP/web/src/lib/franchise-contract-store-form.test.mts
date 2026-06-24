import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildContractStoreFormState,
    readContractStoreFormStatus
} from './franchise-contract-store-form.js';

test('Given a selected candidate source When building the form Then candidate region and address beat lead defaults', () => {
    const form = buildContractStoreFormState(
        {
            name: '문채원',
            interestedBrand: '미카도',
            desiredRegion: '제주 제주시'
        },
        null,
        {
            title: 'QA 후보지',
            region: '서울 광진구',
            address: '서울 광진구 능동로50길 8',
            latitude: 37.1,
            longitude: 127.1
        }
    );

    assert.equal(form.name, 'QA 후보지');
    assert.equal(form.region, '서울 광진구');
    assert.equal(form.address, '서울 광진구 능동로50길 8');
    assert.equal(form.latitude, 37.1);
    assert.equal(form.longitude, 127.1);
});

test('Given an unknown store status When reading form status Then open preparation is used', () => {
    assert.equal(readContractStoreFormStatus('검토중'), '오픈준비');
});
