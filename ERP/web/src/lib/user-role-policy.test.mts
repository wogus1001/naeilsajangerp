import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getUserRoleLabel,
    normalizeAdminAssignableUserRole,
    normalizeUserRole
} from './user-role-policy.js';

test('normalizeAdminAssignableUserRole accepts only team lead and manager roles', () => {
    assert.equal(normalizeAdminAssignableUserRole('manager'), 'manager');
    assert.equal(normalizeAdminAssignableUserRole('sub_manager'), 'sub_manager');
    assert.equal(normalizeAdminAssignableUserRole('admin'), null);
    assert.equal(normalizeAdminAssignableUserRole('staff'), null);
});

test('normalizeUserRole keeps legacy role labels available for display', () => {
    assert.equal(normalizeUserRole('admin'), 'admin');
    assert.equal(getUserRoleLabel('sub_manager'), '매니저');
    assert.equal(getUserRoleLabel('unknown'), '사용자');
});
