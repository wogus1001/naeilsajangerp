import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    canAccessFranchiseLead,
    shouldRestrictFranchiseLeadListToCreator
} from './franchise-lead-access.js';

const partnerLead = {
    company_id: 'company-a',
    manager_id: 'partner-a',
    created_by: 'partner-a'
};

const brandLead = {
    company_id: 'company-a',
    manager_id: 'staff-a',
    created_by: 'staff-a'
};

test('brand employees can access same-company partner-created franchise leads', () => {
    for (const role of ['manager', 'sub_manager', 'staff']) {
        assert.equal(
            canAccessFranchiseLead({ id: `${role}-1`, role, company_id: 'company-a' }, partnerLead),
            true
        );
    }
});

test('partner vendors can access only leads they created', () => {
    assert.equal(
        canAccessFranchiseLead({ id: 'partner-a', role: 'partner_vendor', company_id: 'company-a' }, partnerLead),
        true
    );
    assert.equal(
        canAccessFranchiseLead({ id: 'partner-b', role: 'partner_vendor', company_id: 'company-a' }, partnerLead),
        false
    );
    assert.equal(
        canAccessFranchiseLead({ id: 'partner-a', role: 'partner_vendor', company_id: 'company-a' }, brandLead),
        false
    );
});

test('admin can access all leads and cross-company employees cannot', () => {
    assert.equal(canAccessFranchiseLead({ id: 'admin', role: 'admin', company_id: null }, partnerLead), true);
    assert.equal(canAccessFranchiseLead({ id: 'staff-b', role: 'staff', company_id: 'company-b' }, partnerLead), false);
});

test('partner vendor list scope is creator-only for franchise leads', () => {
    assert.equal(shouldRestrictFranchiseLeadListToCreator({ id: 'partner-a', role: 'partner_vendor', company_id: 'company-a' }), true);
    assert.equal(shouldRestrictFranchiseLeadListToCreator({ id: 'staff-a', role: 'staff', company_id: 'company-a' }), false);
});
