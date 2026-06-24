import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildLeadDocumentStorageData,
    readLeadDocumentScopedStorageTarget,
    readLeadDocumentStorageTarget
} from './franchise-lead-document-storage.js';

test('Given upload storage path When building document data Then bucket and path are persisted', () => {
    assert.deepEqual(buildLeadDocumentStorageData({
        storageBucket: 'property-documents',
        storagePath: 'franchise-lead-documents/lead-1/file.pdf'
    }), {
        storageBucket: 'property-documents',
        storagePath: 'franchise-lead-documents/lead-1/file.pdf'
    });
});

test('Given an uploaded document with stored data When reading storage target Then data path is used', () => {
    assert.deepEqual(readLeadDocumentStorageTarget({
        source_type: 'upload',
        file_url: 'https://example.supabase.co/storage/v1/object/public/property-documents/old.pdf',
        data: {
            storageBucket: 'property-documents',
            storagePath: 'franchise-lead-documents/lead-1/current.pdf'
        }
    }), {
        bucket: 'property-documents',
        path: 'franchise-lead-documents/lead-1/current.pdf'
    });
});

test('Given an older uploaded document without data When reading storage target Then public URL path is inferred', () => {
    assert.deepEqual(readLeadDocumentStorageTarget({
        source_type: 'upload',
        file_url: 'https://example.supabase.co/storage/v1/object/public/property-documents/franchise-lead-documents/lead-1/%ED%8C%8C%EC%9D%BC.pdf'
    }), {
        bucket: 'property-documents',
        path: 'franchise-lead-documents/lead-1/파일.pdf'
    });
});

test('Given an electronic contract document When reading storage target Then no storage deletion target is returned', () => {
    assert.equal(readLeadDocumentStorageTarget({
        source_type: 'electronic_contract',
        file_url: 'https://example.test/document.pdf'
    }), null);
});

test('Given uploaded document storage outside the lead scope When reading scoped target Then deletion is blocked', () => {
    const baseDocument = {
        source_type: 'upload',
        file_url: 'https://example.supabase.co/storage/v1/object/public/property-documents/franchise-lead-documents/company-1/lead-1/file.pdf',
        data: {
            storageBucket: 'property-documents',
            storagePath: 'franchise-lead-documents/company-2/lead-2/file.pdf'
        }
    };

    assert.equal(readLeadDocumentScopedStorageTarget(baseDocument, {
        companyId: 'company-1',
        leadId: 'lead-1'
    }), null);
    assert.equal(readLeadDocumentScopedStorageTarget({
        ...baseDocument,
        data: {
            storageBucket: 'avatars',
            storagePath: 'franchise-lead-documents/company-1/lead-1/file.pdf'
        }
    }, {
        companyId: 'company-1',
        leadId: 'lead-1'
    }), null);
    assert.equal(readLeadDocumentScopedStorageTarget({
        ...baseDocument,
        data: {
            storageBucket: 'property-documents',
            storagePath: 'franchise-lead-documents/company-1/lead-1/../other/file.pdf'
        }
    }, {
        companyId: 'company-1',
        leadId: 'lead-1'
    }), null);
});

test('Given uploaded document storage inside the lead scope When reading scoped target Then deletion target is returned', () => {
    assert.deepEqual(readLeadDocumentScopedStorageTarget({
        source_type: 'upload',
        data: {
            storageBucket: 'property-documents',
            storagePath: 'franchise-lead-documents/company-1/lead-1/file.pdf'
        }
    }, {
        companyId: 'company-1',
        leadId: 'lead-1'
    }), {
        bucket: 'property-documents',
        path: 'franchise-lead-documents/company-1/lead-1/file.pdf'
    });
});
