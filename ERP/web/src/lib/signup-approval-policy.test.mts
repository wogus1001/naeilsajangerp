import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getPendingApprovalLoginMessage,
    isActiveCompanyManagerProfile,
    normalizeSignupRole,
    resolveSignupApprovalPolicy,
    shouldAssignCompanyManager
} from './signup-approval-policy.js';

test('Given a stale manager id When validating the company manager Then it is inactive', () => {
    assert.equal(isActiveCompanyManagerProfile({
        companyId: 'company-1',
        managerId: 'deleted-manager',
        profile: null
    }), false);
});

test('Given an active team lead When validating the same company Then it is active', () => {
    assert.equal(isActiveCompanyManagerProfile({
        companyId: 'company-1',
        managerId: 'manager-1',
        profile: {
            id: 'manager-1',
            companyId: 'company-1',
            role: 'manager',
            status: 'active'
        }
    }), true);
});

test('Given a manager from another company When validating the company manager Then it is inactive', () => {
    assert.equal(isActiveCompanyManagerProfile({
        companyId: 'company-1',
        managerId: 'manager-1',
        profile: {
            id: 'manager-1',
            companyId: 'company-2',
            role: 'manager',
            status: 'active'
        }
    }), false);
});

test('Given a stale manager link When promoting a team lead Then the company manager is reassigned', () => {
    assert.equal(shouldAssignCompanyManager({
        companyId: 'company-1',
        currentManagerId: 'deleted-manager',
        currentManagerProfile: null
    }), true);
});

test('Given a valid manager link When promoting another team lead Then the existing link is preserved', () => {
    assert.equal(shouldAssignCompanyManager({
        companyId: 'company-1',
        currentManagerId: 'manager-1',
        currentManagerProfile: {
            id: 'manager-1',
            companyId: 'company-1',
            role: 'manager',
            status: 'active'
        }
    }), false);
});

test('new company signup always becomes a manager request waiting for admin approval', () => {
    const policy = resolveSignupApprovalPolicy({
        companyExists: false,
        companyHasManager: false,
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

test('existing company brand employee signup becomes manager request when no team lead exists', () => {
    const policy = resolveSignupApprovalPolicy({
        companyExists: true,
        companyHasManager: false,
        requestedRole: 'staff'
    });

    assert.deepEqual(policy, {
        kind: 'allow',
        role: 'manager',
        status: 'pending_approval',
        approvalOwner: 'admin',
        message: '회사에 등록된 팀장이 없어 팀장 권한으로 접수되었습니다. 관리자 승인 후 로그인이 가능합니다.'
    });
});

test('existing company brand employee signup becomes sub manager request when team lead exists', () => {
    const policy = resolveSignupApprovalPolicy({
        companyExists: true,
        companyHasManager: true,
        requestedRole: 'staff'
    });

    assert.deepEqual(policy, {
        kind: 'allow',
        role: 'sub_manager',
        status: 'pending_approval',
        approvalOwner: 'manager',
        message: '가입 요청이 완료되었습니다. 매니저 권한으로 접수되며, 팀장 승인 후 로그인이 가능합니다.'
    });
});

test('existing company partner vendor signup waits for manager approval', () => {
    const policy = resolveSignupApprovalPolicy({
        companyExists: true,
        companyHasManager: true,
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
        companyHasManager: true,
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
