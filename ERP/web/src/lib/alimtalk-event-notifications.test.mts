import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
    buildSignupApprovedAlimtalkVariables,
    buildSignupRequestAlimtalkVariables
} from './alimtalk-event-notifications';

test('Given sub manager signup request When building AlimTalk variables Then role is shown as Korean label', () => {
    assert.deepEqual(buildSignupRequestAlimtalkVariables({
        applicantName: '김재현',
        companyName: '내일사장',
        requestedAt: new Date('2026-07-02T00:00:00.000Z'),
        requestedRole: 'sub_manager'
    }), {
        가입유형: '매니저',
        회사명: '내일사장',
        신청자명: '김재현',
        요청일: '2026. 07. 02.'
    });
});

test('Given approved signup When building AlimTalk variables Then template applicant name is included', () => {
    assert.deepEqual(buildSignupApprovedAlimtalkVariables({
        approvedAt: new Date('2026-07-02T00:00:00.000Z'),
        companyName: '내일사장',
        name: '김재현'
    }), {
        승인일: '2026. 07. 02.',
        회사명: '내일사장',
        신청자명: '김재현',
        회원명: '김재현'
    });
});
