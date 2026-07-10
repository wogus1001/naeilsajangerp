import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
    buildOwnerAccountCreatedAlimtalkLogVariables,
    buildOwnerAccountCreatedAlimtalkVariables,
    buildOwnerFacilityRequestAlimtalkVariables,
    buildOwnerNoticePublishedAlimtalkVariables
} from './alimtalk-owner-portal-notifications';
import { ALIMTALK_SCENARIO_KEYS } from './alimtalk-send';
import { buildAlimtalkLogVariables } from './alimtalk-send-support';

test('Given owner notice publish data When building AlimTalk variables Then approved template variables are mapped', () => {
    assert.deepEqual(buildOwnerNoticePublishedAlimtalkVariables({
        brandName: '테스트치킨',
        noticeTitle: '7월 위생 점검 안내',
        publishedAt: '2026-07-09T05:04:00.000Z'
    }), {
        공지제목: '7월 위생 점검 안내',
        발행일: '2026. 07. 09.',
        브랜드명: '테스트치킨'
    });
});

test('Given owner facility request data When building AlimTalk variables Then store and owner fields are mapped', () => {
    assert.deepEqual(buildOwnerFacilityRequestAlimtalkVariables({
        locationName: '강남 1호점',
        ownerName: '김점주',
        requestTitle: '냉장고 이상',
        submittedAt: '2026-07-09T05:23:00.000Z'
    }), {
        매장명: '강남 1호점',
        문의제목: '냉장고 이상',
        접수일: '2026. 07. 09.',
        점주명: '김점주'
    });
});

test('Given owner account credentials When building AlimTalk variables Then login credentials are mapped', () => {
    assert.deepEqual(buildOwnerAccountCreatedAlimtalkVariables({
        loginId: 'owner-gangnam',
        temporaryPassword: 'temp-1234'
    }), {
        임시비밀번호: 'temp-1234',
        점주아이디: 'owner-gangnam'
    });
});

test('Given owner account credentials When building log variables Then temporary password is masked', () => {
    const sendVariables = buildOwnerAccountCreatedAlimtalkVariables({
        loginId: 'owner-gangnam',
        temporaryPassword: 'temp-1234'
    });

    assert.deepEqual(buildAlimtalkLogVariables({
        companyId: 'company-1',
        logVariables: buildOwnerAccountCreatedAlimtalkLogVariables({ loginId: 'owner-gangnam' }),
        recipient: { name: '김점주', phone: '01012345678' },
        scenarioKey: 'owner_account_created',
        sourceId: 'account-1:2026-07-09T00:00:00.000Z',
        sourceType: 'owner-account-created',
        variables: sendVariables
    }), {
        '#{임시비밀번호}': '[마스킹]',
        '#{점주아이디}': 'owner-gangnam'
    });
});

test('Given owner portal AlimTalk scenarios When reading supported keys Then all approved owner templates are routable', () => {
    assert.equal(ALIMTALK_SCENARIO_KEYS.includes('owner_notice_published'), true);
    assert.equal(ALIMTALK_SCENARIO_KEYS.includes('owner_facility_request_created'), true);
    assert.equal(ALIMTALK_SCENARIO_KEYS.includes('owner_account_created'), true);
});
