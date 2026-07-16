import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from './api-auth.js';
import { canDeleteWorkIntakeRecord, canEditWorkIntakeRecord, type WorkIntakeAccessRow } from './work-intake-access.js';

const row: WorkIntakeAccessRow = {
    company_id: 'company-1',
    manager_id: 'author-1'
};

function requester(id: string, role: string, companyId = 'company-1'): RequesterProfile {
    return {
        id,
        role,
        company_id: companyId,
        status: 'active'
    };
}

test('Given same company staff did not create a work intake record When checking delete access Then deletion is blocked', () => {
    assert.equal(canDeleteWorkIntakeRecord(requester('staff-1', 'staff'), row), false);
});

test('Given same company staff did not create a work intake record When checking edit access Then editing is blocked', () => {
    assert.equal(canEditWorkIntakeRecord(requester('staff-1', 'staff'), row), false);
});

test('Given record author or team lead checks edit access Then editing is allowed', () => {
    assert.equal(canEditWorkIntakeRecord(requester('author-1', 'staff'), row), true);
    assert.equal(canEditWorkIntakeRecord(requester('manager-1', 'manager'), row), true);
});

test('Given record author or team lead checks delete access Then deletion is allowed', () => {
    assert.equal(canDeleteWorkIntakeRecord(requester('author-1', 'staff'), row), true);
    assert.equal(canDeleteWorkIntakeRecord(requester('manager-1', 'manager'), row), true);
});

test('Given admin checks work intake access Then edit and delete are allowed', () => {
    assert.equal(canEditWorkIntakeRecord(requester('admin-1', 'admin', 'company-2'), row), true);
    assert.equal(canDeleteWorkIntakeRecord(requester('admin-1', 'admin', 'company-2'), row), true);
});
