import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getPendingApprovalLoginMessage,
    normalizeSignupRole,
    resolveSignupApprovalPolicy
} from './signup-approval-policy.js';

test('new company signup always becomes a manager request waiting for admin approval', () => {
    const policy = resolveSignupApprovalPolicy({
        companyExists: false,
        requestedRole: 'staff'
    });

    assert.deepEqual(policy, {
        kind: 'allow',
        role: 'manager',
        status: 'pending_approval',
        approvalOwner: 'admin',
        message: '회사 등록 요청이 접수되었습니다. 최초 가입자는 팀장 권한으로 등록되며, 관리자 승인 후 로그인이 가능합니다.'
    });
});

test('existing company staff signup waits for manager approval', () => {
    const policy = resolveSignupApprovalPolicy({
        companyExists: true,
        requestedRole: 'staff'
    });

    assert.deepEqual(policy, {
        kind: 'allow',
        role: 'staff',
        status: 'pending_approval',
        approvalOwner: 'manager',
        message: '가입 요청이 완료되었습니다. 팀장 승인 후 로그인이 가능합니다.'
    });
});

test('existing company partner vendor signup waits for manager approval', () => {
    const policy = resolveSignupApprovalPolicy({
        companyExists: true,
        requestedRole: 'partner_vendor'
    });

    assert.deepEqual(policy, {
        kind: 'allow',
        role: 'partner_vendor',
        status: 'pending_approval',
        approvalOwner: 'manager',
        message: '협력업체 가입 요청이 완료되었습니다. 팀장 승인 후 로그인이 가능합니다.'
    });
});

test('existing company cannot request another manager from public signup', () => {
    const policy = resolveSignupApprovalPolicy({
        companyExists: true,
        requestedRole: 'manager'
    });

    assert.equal(policy.kind, 'reject');
    if (policy.kind === 'reject') {
        assert.match(policy.error, /추가 팀장 권한/);
    }
});

test('unknown signup role falls back to staff', () => {
    assert.equal(normalizeSignupRole('owner'), 'staff');
    assert.equal(normalizeSignupRole(null), 'staff');
    assert.equal(normalizeSignupRole('manager'), 'manager');
    assert.equal(normalizeSignupRole('partner_vendor'), 'partner_vendor');
});

test('pending login message separates admin and manager approval owners', () => {
    assert.equal(
        getPendingApprovalLoginMessage('manager'),
        '관리자 승인 대기 중입니다. 승인 후 로그인이 가능합니다.'
    );
    assert.equal(
        getPendingApprovalLoginMessage('partner_vendor'),
        '팀장 승인 대기 중입니다. 승인 후 로그인이 가능합니다.'
    );
    assert.equal(
        getPendingApprovalLoginMessage('staff'),
        '팀장 승인 대기 중입니다. 승인 후 로그인이 가능합니다.'
    );
});
