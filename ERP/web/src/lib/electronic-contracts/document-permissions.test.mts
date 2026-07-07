import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    canCancelElectronicContract,
    canDeleteElectronicContract,
    isElectronicContractCancelableStatus,
    isElectronicContractDownloadableStatus,
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

test('Given a document owner When checking document cancellation Then cancellation is allowed', () => {
    const allowed = canCancelElectronicContract(
        { id: 'owner-1', role: 'staff' },
        { sentByProfileId: 'owner-1' }
    );

    assert.equal(allowed, true);
});

test('Given a same company member When checking document cancellation Then cancellation is denied', () => {
    const allowed = canCancelElectronicContract(
        { id: 'staff-2', role: 'staff', companyId: 'company-1' },
        { sentByProfileId: 'owner-1', companyId: 'company-1' }
    );

    assert.equal(allowed, false);
});

test('Given a same company manager When checking document access Then viewing is allowed', () => {
    const allowed = canViewElectronicContract(
        { id: 'manager-2', role: 'manager', companyId: 'company-1' },
        { sentByProfileId: 'owner-1', companyId: 'company-1' }
    );

    assert.equal(allowed, true);
});

test('Given a same company sub manager When checking document access Then viewing is allowed', () => {
    const allowed = canViewElectronicContract(
        { id: 'sub-manager-2', role: 'sub_manager', companyId: 'company-1' },
        { sentByProfileId: 'owner-1', companyId: 'company-1' }
    );

    assert.equal(allowed, true);
});

test('Given a same company staff member When checking document access Then viewing is denied', () => {
    const allowed = canViewElectronicContract(
        { id: 'staff-2', role: 'staff', companyId: 'company-1' },
        { sentByProfileId: 'owner-1', companyId: 'company-1' }
    );

    assert.equal(allowed, false);
});

test('Given a different company member When checking document access Then viewing is denied', () => {
    const allowed = canViewElectronicContract(
        { id: 'staff-2', role: 'staff', companyId: 'company-2' },
        { sentByProfileId: 'owner-1', companyId: 'company-1' }
    );

    assert.equal(allowed, false);
});

test('Given document statuses When checking cancellation eligibility Then only active requests are cancelable', () => {
    assert.equal(isElectronicContractCancelableStatus('sending'), true);
    assert.equal(isElectronicContractCancelableStatus('sent'), true);
    assert.equal(isElectronicContractCancelableStatus('completed'), false);
    assert.equal(isElectronicContractCancelableStatus('canceled'), false);
    assert.equal(isElectronicContractCancelableStatus('draft'), false);
    assert.equal(isElectronicContractCancelableStatus(null), false);
});

test('Given document statuses When checking download eligibility Then only completed documents are downloadable', () => {
    assert.equal(isElectronicContractDownloadableStatus('completed'), true);
    assert.equal(isElectronicContractDownloadableStatus('sent'), false);
    assert.equal(isElectronicContractDownloadableStatus('sending'), false);
    assert.equal(isElectronicContractDownloadableStatus('canceled'), false);
    assert.equal(isElectronicContractDownloadableStatus('send_failed'), false);
    assert.equal(isElectronicContractDownloadableStatus('draft'), false);
    assert.equal(isElectronicContractDownloadableStatus(null), false);
});
