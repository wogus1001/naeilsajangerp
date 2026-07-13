import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RequesterProfile } from '@/lib/api-auth';
import { canUploadToTarget, type UploadAccessSupabase } from './upload-storage-access.js';
import type { UploadStorageTarget } from './upload-storage-policy.js';

const requester: RequesterProfile = {
    company_id: 'company-1',
    id: 'requester-1',
    role: 'manager'
};

function fakeSupabase(row: unknown | null): UploadAccessSupabase {
    return {
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async <T,>() => ({
                        data: row as T | null
                    })
                })
            })
        })
    };
}

test('Given a lead document target for another company When checking upload access Then it is denied', async () => {
    const target: UploadStorageTarget = {
        bucket: 'franchise-supervision-private',
        companyId: 'company-2',
        kind: 'leadDocument',
        leadId: 'lead-2',
        path: 'franchise-lead-documents/company-2/lead-2/file.pdf'
    };

    assert.equal(await canUploadToTarget(fakeSupabase({
        company_id: 'company-2',
        created_by: null,
        manager_id: null
    }), requester, target), false);
});

test('Given a property upload target for another company When checking upload access Then it is denied', async () => {
    const target: UploadStorageTarget = {
        bucket: 'property-images',
        kind: 'propertyImage',
        path: 'property-2/photo.jpg',
        propertyId: 'property-2'
    };

    assert.equal(await canUploadToTarget(fakeSupabase({
        company_id: 'company-2',
        manager_id: null
    }), requester, target), false);
});

test('Given a disclosure upload target for another company When checking upload access Then it is denied', async () => {
    const target: UploadStorageTarget = {
        bucket: 'property-documents',
        companyId: 'company-2',
        kind: 'disclosure',
        path: 'franchise-disclosures/company-2/file.pdf'
    };

    assert.equal(await canUploadToTarget(fakeSupabase(null), requester, target), false);
});

test('Given a supervision report owned by another member When checking upload access Then it is denied', async () => {
    const target: UploadStorageTarget = {
        bucket: 'franchise-supervision-private',
        companyId: 'company-1',
        kind: 'supervisionReport',
        path: 'franchise-supervision/company-1/report-1/photo.jpg',
        reportId: 'report-1'
    };

    assert.equal(await canUploadToTarget(fakeSupabase({
        company_id: 'company-1',
        created_by: 'another-member',
        status: '임시저장'
    }), requester, target), false);
});

test('Given the report author and an editable report When checking upload access Then it is allowed', async () => {
    const target: UploadStorageTarget = {
        bucket: 'franchise-supervision-private',
        companyId: 'company-1',
        kind: 'supervisionReport',
        path: 'franchise-supervision/company-1/report-1/photo.jpg',
        reportId: 'report-1'
    };

    assert.equal(await canUploadToTarget(fakeSupabase({
        company_id: 'company-1',
        created_by: requester.id,
        status: '반려'
    }), requester, target), true);
});

test('Given a submitted supervision report When checking upload access Then evidence stays immutable', async () => {
    const target: UploadStorageTarget = {
        bucket: 'franchise-supervision-private',
        companyId: 'company-1',
        kind: 'supervisionReport',
        path: 'franchise-supervision/company-1/report-1/photo.jpg',
        reportId: 'report-1'
    };

    assert.equal(await canUploadToTarget(fakeSupabase({
        company_id: 'company-1',
        created_by: requester.id,
        status: '제출'
    }), requester, target), false);
});
