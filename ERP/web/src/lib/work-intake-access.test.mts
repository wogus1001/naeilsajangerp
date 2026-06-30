import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canManageWorkIntakeRecord } from './work-intake-access.js';

const intakeRow = {
    company_id: 'company-a',
    manager_id: 'author-a',
    created_by: 'author-a'
};

test('Given a work intake row When checking management access Then the author can edit and delete it', () => {
    assert.equal(
        canManageWorkIntakeRecord({ id: 'author-a', role: 'staff', company_id: 'company-a' }, intakeRow),
        true
    );
});

test('Given a work intake row When checking management access Then the same-company team lead can edit and delete it', () => {
    assert.equal(
        canManageWorkIntakeRecord({ id: 'lead-a', role: 'manager', company_id: 'company-a' }, intakeRow),
        true
    );
});

test('Given a work intake row When checking management access Then non-author employees cannot edit or delete it', () => {
    for (const role of ['sub_manager', 'staff', 'partner_vendor']) {
        assert.equal(
            canManageWorkIntakeRecord({ id: `${role}-a`, role, company_id: 'company-a' }, intakeRow),
            false
        );
    }
});

test('Given a work intake row When checking management access Then cross-company team leads cannot edit or delete it', () => {
    assert.equal(
        canManageWorkIntakeRecord({ id: 'lead-b', role: 'manager', company_id: 'company-b' }, intakeRow),
        false
    );
});

test('Given a work intake row When checking management access Then platform admins can edit and delete it as an exception', () => {
    assert.equal(
        canManageWorkIntakeRecord({ id: 'admin-a', role: 'admin', company_id: null }, intakeRow),
        true
    );
});
