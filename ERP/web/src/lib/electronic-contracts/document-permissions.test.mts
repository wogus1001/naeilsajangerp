import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    canDeleteElectronicContract,
    canViewElectronicContract
} from './document-permissions.js';

test('Given an admin user When checking document deletion Then deletion is allowed', () => {
    const allowed = canDeleteElectronicContract(
        { id: 'admin-1', role: 'admin' },
        { sentByProfileId: 'owner-1' }
    );

    assert.equal(allowed, true);
});

test('Given a document owner When checking document deletion Then deletion is allowed', () => {
    const allowed = canDeleteElectronicContract(
        { id: 'owner-1', role: 'staff' },
        { sentByProfileId: 'owner-1' }
    );

    assert.equal(allowed, true);
});

test('Given another company member When checking document deletion Then deletion is denied', () => {
    const allowed = canDeleteElectronicContract(
        { id: 'staff-2', role: 'staff' },
        { sentByProfileId: 'owner-1' }
    );

    assert.equal(allowed, false);
});

test('Given a same company member When checking document access Then viewing is allowed', () => {
    const allowed = canViewElectronicContract(
        { id: 'staff-2', role: 'staff', companyId: 'company-1' },
        { sentByProfileId: 'owner-1', companyId: 'company-1' }
    );

    assert.equal(allowed, true);
});

test('Given a different company member When checking document access Then viewing is denied', () => {
    const allowed = canViewElectronicContract(
        { id: 'staff-2', role: 'staff', companyId: 'company-2' },
        { sentByProfileId: 'owner-1', companyId: 'company-1' }
    );

    assert.equal(allowed, false);
});
