import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildFranchiseIntakeSmsText,
    getSolapiNotificationConfig,
    normalizeSolapiPhone,
    parseAlertRecipients
} from './solapi-notifications.js';

test('Given property intake details When building SMS Then registration summary is included', () => {
    assert.equal(
        buildFranchiseIntakeSmsText({
            kind: 'property',
            companyName: '내일',
            title: '강남역 코너 매장',
            contact: null,
            region: '서울 강남구'
        }),
        '[ERP] 입점요청 등록: 내일 / 강남역 코너 매장 / 서울 강남구. 진행현황에서 확인해주세요.'
    );
});

test('Given matching request details When building SMS Then contact is normalized', () => {
    assert.equal(
        buildFranchiseIntakeSmsText({
            kind: 'matchingRequest',
            companyName: '내일',
            title: '홍길동',
            contact: '010-1111-2222',
            region: '서울 송파구'
        }),
        '[ERP] 예비창업자 등록: 내일 / 홍길동 / 서울 송파구 / 연락처: 01011112222. 진행현황에서 확인해주세요.'
    );
});

test('Given phone input When normalizing for Solapi Then only digits remain', () => {
    assert.equal(normalizeSolapiPhone('010-1234-5678'), '01012345678');
    assert.equal(normalizeSolapiPhone(' 02 123 4567 '), '021234567');
});

test('Given comma separated recipients When parsing alert phones Then invalid values are dropped', () => {
    assert.deepEqual(
        parseAlertRecipients('010-1111-2222, invalid, 01033334444'),
        ['01011112222', '01033334444']
    );
});

test('Given disabled env When reading config Then SMS is disabled', () => {
    assert.deepEqual(
        getSolapiNotificationConfig({
            SOLAPI_SMS_ENABLED: 'false',
            SOLAPI_API_KEY: 'key',
            SOLAPI_API_SECRET: 'secret',
            SOLAPI_SENDER_PHONE: '010-0000-0000',
            SIGNUP_ADMIN_ALERT_PHONES: '010-1111-2222'
        }),
        { enabled: false, reason: 'disabled' }
    );
});

test('Given complete env When reading config Then normalized sender and recipients are returned', () => {
    assert.deepEqual(
        getSolapiNotificationConfig({
            SOLAPI_SMS_ENABLED: 'true',
            SOLAPI_API_KEY: 'key',
            SOLAPI_API_SECRET: 'secret',
            SOLAPI_SENDER_PHONE: '010-0000-0000',
            SIGNUP_ADMIN_ALERT_PHONES: '010-1111-2222,01033334444'
        }),
        {
            enabled: true,
            apiKey: 'key',
            apiSecret: 'secret',
            senderPhone: '01000000000',
            adminAlertPhones: ['01011112222', '01033334444'],
            franchiseIntakeAlertPhones: []
        }
    );
});

test('Given intake recipients env When reading config Then franchise intake recipients are normalized', () => {
    assert.deepEqual(
        getSolapiNotificationConfig({
            SOLAPI_SMS_ENABLED: 'true',
            SOLAPI_API_KEY: 'key',
            SOLAPI_API_SECRET: 'secret',
            SOLAPI_SENDER_PHONE: '010-0000-0000',
            SIGNUP_ADMIN_ALERT_PHONES: '010-1111-2222',
            FRANCHISE_INTAKE_ALERT_PHONES: '010-5555-6666, invalid'
        }),
        {
            enabled: true,
            apiKey: 'key',
            apiSecret: 'secret',
            senderPhone: '01000000000',
            adminAlertPhones: ['01011112222'],
            franchiseIntakeAlertPhones: ['01055556666']
        }
    );
});
