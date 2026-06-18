import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    canAccessFranchiseLocation,
    shouldRestrictFranchiseLocationListToCreator
} from './franchise-location-access.js';

const location = {
    company_id: 'company-a',
    manager_id: 'manager-a',
    created_by: 'partner-a'
};

test('brand company employees can see company franchise locations', () => {
    for (const role of ['manager', 'sub_manager', 'staff']) {
        assert.equal(
            canAccessFranchiseLocation({ id: `${role}-1`, role, company_id: 'company-a' }, location),
            true
        );
    }
});

test('partner vendors can only access their own franchise locations', () => {
    assert.equal(
        canAccessFranchiseLocation({ id: 'partner-a', role: 'partner_vendor', company_id: 'company-a' }, location),
        true
    );
    assert.equal(
        canAccessFranchiseLocation({ id: 'partner-b', role: 'partner_vendor', company_id: 'company-a' }, location),
        false
    );
});

test('admin can access all franchise locations and cross-company users cannot', () => {
    assert.equal(canAccessFranchiseLocation({ id: 'admin', role: 'admin', company_id: null }, location), true);
    assert.equal(canAccessFranchiseLocation({ id: 'staff-b', role: 'staff', company_id: 'company-b' }, location), false);
});

test('legacy no-company managers can access locations assigned to them', () => {
    assert.equal(
        canAccessFranchiseLocation(
            { id: 'manager-a', role: 'manager', company_id: null },
            { company_id: null, manager_id: 'manager-a', created_by: null }
        ),
        true
    );
});

test('partner vendor list scope is creator-only', () => {
    assert.equal(shouldRestrictFranchiseLocationListToCreator({ id: 'partner-a', role: 'partner_vendor', company_id: 'company-a' }), true);
    assert.equal(shouldRestrictFranchiseLocationListToCreator({ id: 'staff-a', role: 'staff', company_id: 'company-a' }), false);
});
