import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
    buildAlimtalkVariables,
    isFinalAlimtalkSendStatus,
    isKoreanMobileRecipientPhone,
    resolveAlimtalkBlockReason,
    type AlimtalkCompanySettingConfigRow,
    type AlimtalkScenarioConfigRow,
    type AlimtalkTemplateConfigRow
} from './alimtalk-send-support';

const enabledScenario: AlimtalkScenarioConfigRow = {
    enabled: true,
    fallback_channel: 'none',
    scenario_key: 'signup_request',
    template_key: 'signup_request'
};

const approvedTemplate: AlimtalkTemplateConfigRow = {
    channel_id: 'pf-channel',
    enabled: true,
    status: 'approved',
    template_id: 'template-id',
    template_key: 'signup_request'
};

const enabledCompanySetting: AlimtalkCompanySettingConfigRow = {
    enabled: true,
    monthly_limit: 100
};

test('buildAlimtalkVariables wraps plain keys and preserves existing kakao variable keys', () => {
    assert.deepEqual(buildAlimtalkVariables({
        '#{신청자명}': '김재현',
        회사명: '내일사장',
        빈키: ''
    }), {
        '#{신청자명}': '김재현',
        '#{회사명}': '내일사장',
        '#{빈키}': ''
    });
});

test('isFinalAlimtalkSendStatus treats only successful delivery states as final', () => {
    assert.equal(isFinalAlimtalkSendStatus('success'), true);
    assert.equal(isFinalAlimtalkSendStatus('fallback_sms'), true);
    assert.equal(isFinalAlimtalkSendStatus('blocked'), false);
    assert.equal(isFinalAlimtalkSendStatus('failed'), false);
});

test('resolveAlimtalkBlockReason blocks unapproved templates', () => {
    assert.equal(resolveAlimtalkBlockReason({
        companySetting: enabledCompanySetting,
        monthlySendCount: 0,
        providerEnabled: true,
        recipientPhone: '01012345678',
        scenario: enabledScenario,
        template: { ...approvedTemplate, status: 'submitted' }
    }), 'template is not approved');
});

test('resolveAlimtalkBlockReason blocks company monthly limit overflow', () => {
    assert.equal(resolveAlimtalkBlockReason({
        companySetting: { enabled: true, monthly_limit: 3 },
        monthlySendCount: 3,
        providerEnabled: true,
        recipientPhone: '01012345678',
        scenario: enabledScenario,
        template: approvedTemplate
    }), 'company monthly limit reached');
});

test('resolveAlimtalkBlockReason blocks non-mobile recipients when a mobile recipient is required', () => {
    assert.equal(isKoreanMobileRecipientPhone('01012345678'), true);
    assert.equal(isKoreanMobileRecipientPhone('0212345678'), false);
    assert.equal(resolveAlimtalkBlockReason({
        companySetting: enabledCompanySetting,
        monthlySendCount: 0,
        providerEnabled: true,
        recipientPhone: '0212345678',
        requiresMobileRecipient: true,
        scenario: enabledScenario,
        template: approvedTemplate
    }), 'recipient phone must be a mobile number');
});

test('resolveAlimtalkBlockReason allows enabled provider, scenario, template, company, and recipient', () => {
    assert.equal(resolveAlimtalkBlockReason({
        companySetting: enabledCompanySetting,
        monthlySendCount: 0,
        providerEnabled: true,
        recipientPhone: '01012345678',
        scenario: enabledScenario,
        template: approvedTemplate
    }), null);
});
