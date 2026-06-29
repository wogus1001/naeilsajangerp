import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildSignupApprovalSmsText,
    buildSignupRequestSmsText,
    getSolapiNotificationConfig,
    normalizeSolapiPhone,
    parseAlertRecipients
} from './solapi-notifications.js';

test('Given signup request details When building admin SMS Then ERP prefix is used', () => {
    assert.equal(
        buildSignupRequestSmsText({
            companyName: '내일',
            name: '김관리',
            phone: '010-1234-5678'
        }),
        '[ERP] 신규 회원가입 요청: 내일 / 김관리 / 01012345678. 관리자 화면에서 승인 여부를 확인해주세요.'
    );
});

test('Given approval success When building user SMS Then ERP prefix is used', () => {
    assert.equal(
        buildSignupApprovalSmsText(),
        '[ERP] 회원가입이 승인되었습니다. 로그인 후 서비스를 이용해주세요.'
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
            adminAlertPhones: ['01011112222', '01033334444']
        }
    );
});
