import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getUserRoleLabel,
    isBrandStaffUserRole,
    normalizeAdminAssignableUserRole,
    normalizeUserRole
} from './user-role-policy.js';

test('normalizeAdminAssignableUserRole accepts admin-managed non-admin roles', () => {
    assert.equal(normalizeAdminAssignableUserRole('manager'), 'manager');
    assert.equal(normalizeAdminAssignableUserRole('sub_manager'), 'sub_manager');
    assert.equal(normalizeAdminAssignableUserRole('partner_vendor'), 'partner_vendor');
    assert.equal(normalizeAdminAssignableUserRole('admin'), null);
    assert.equal(normalizeAdminAssignableUserRole('staff'), null);
});

test('normalizeUserRole keeps legacy role labels available for display', () => {
    assert.equal(normalizeUserRole('admin'), 'admin');
    assert.equal(getUserRoleLabel('sub_manager'), '매니저');
    assert.equal(getUserRoleLabel('partner_vendor'), '협력업체');
    assert.equal(getUserRoleLabel('unknown'), '사용자');
});

test('isBrandStaffUserRole groups staff and sub managers as company employees', () => {
    assert.equal(isBrandStaffUserRole('staff'), true);
    assert.equal(isBrandStaffUserRole('sub_manager'), true);
    assert.equal(isBrandStaffUserRole('manager'), false);
    assert.equal(isBrandStaffUserRole('partner_vendor'), false);
});
