import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildUserUpdateLookup, evaluateUserDeleteGuard } from './userRouteHelpers.js';

const adminRequester = { id: 'admin-1', role: 'admin' };
const managerTarget = { id: 'manager-1', role: 'manager', company_id: 'company-1' };

test('evaluateUserDeleteGuard blocks non-admin deletion of another user', () => {
    const result = evaluateUserDeleteGuard({
        requesterProfile: { id: 'staff-1', role: 'staff' },
        targetProfile: managerTarget,
        otherManagersCount: 1,
        otherMembersCount: 2
    });

    assert.deepEqual(result, {
        allowed: false,
        status: 403,
        error: 'Forbidden: You can only delete your own account'
    });
});

test('evaluateUserDeleteGuard blocks admin account deletion', () => {
    const result = evaluateUserDeleteGuard({
        requesterProfile: adminRequester,
        targetProfile: { id: 'admin-2', role: 'admin', company_id: 'company-1' },
        otherManagersCount: 0,
        otherMembersCount: 0
    });

    assert.deepEqual(result, {
        allowed: false,
        status: 403,
        error: '관리자 계정은 사용자 관리에서 삭제할 수 없습니다.'
    });
});

test('evaluateUserDeleteGuard blocks deleting the last team lead while members remain', () => {
    const result = evaluateUserDeleteGuard({
        requesterProfile: adminRequester,
        targetProfile: managerTarget,
        otherManagersCount: 0,
        otherMembersCount: 2
    });

    assert.equal(result.allowed, false);
    if (!result.allowed) {
        assert.equal(result.status, 400);
        assert.match(result.error, /팀장은 최소 1명/);
    }
});

test('evaluateUserDeleteGuard allows deleting a non-admin when company guard passes', () => {
    const result = evaluateUserDeleteGuard({
        requesterProfile: adminRequester,
        targetProfile: { id: 'sub-manager-1', role: 'sub_manager', company_id: 'company-1' },
        otherManagersCount: 0,
        otherMembersCount: 0
    });

    assert.deepEqual(result, { allowed: true });
});

test('buildUserUpdateLookup keeps uuid and email fallback for pending user approval', () => {
    const result = buildUserUpdateLookup({
        id: '60295f17-02b6-4e68-bb35-dd9ad23e80ac',
        email: 'remax@naver.com'
    });

    assert.deepEqual(result, {
        ids: ['60295f17-02b6-4e68-bb35-dd9ad23e80ac'],
        emails: ['remax@naver.com']
    });
});

test('buildUserUpdateLookup preserves legacy short id email lookup', () => {
    const result = buildUserUpdateLookup({ id: 'admin', email: null });

    assert.deepEqual(result, {
        ids: [],
        emails: ['admin@example.com', 'admin']
    });
});
