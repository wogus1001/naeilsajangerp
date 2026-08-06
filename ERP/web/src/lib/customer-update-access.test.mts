import assert from 'node:assert/strict';
import test from 'node:test';
import { canUpdateCustomer } from './customer-update-access.ts';

test('관리자는 담당자 지정 여부와 관계없이 고객을 수정할 수 있다', () => {
    assert.equal(canUpdateCustomer({ requesterId: 'admin-1', requesterRole: 'admin', assignedManagerId: 'staff-1' }), true);
});

test('팀 관리자는 담당자 지정 여부와 관계없이 고객을 수정할 수 있다', () => {
    assert.equal(canUpdateCustomer({ requesterId: 'manager-1', requesterRole: 'manager', assignedManagerId: 'staff-1' }), true);
});

test('담당자는 자신에게 배정된 고객을 수정할 수 있다', () => {
    assert.equal(canUpdateCustomer({ requesterId: 'staff-1', requesterRole: 'staff', assignedManagerId: 'staff-1' }), true);
});

test('담당자 미지정 고객은 같은 회사 담당자가 작업내역을 기록할 수 있다', () => {
    assert.equal(canUpdateCustomer({ requesterId: 'staff-1', requesterRole: 'staff', assignedManagerId: null }), true);
});

test('다른 담당자에게 배정된 고객은 일반 담당자가 수정할 수 없다', () => {
    assert.equal(canUpdateCustomer({ requesterId: 'staff-1', requesterRole: 'staff', assignedManagerId: 'staff-2' }), false);
});
