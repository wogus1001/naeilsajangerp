import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    MAX_UPLOAD_FILE_BYTES,
    shouldReturnUploadPublicUrl,
    validateUploadFileForTarget
} from './upload-file-validation.js';
import type { UploadStorageTarget } from './upload-storage-policy.js';

const leadDocumentTarget: UploadStorageTarget = {
    bucket: 'property-documents',
    companyId: 'company-1',
    kind: 'leadDocument',
    leadId: 'lead-1',
    path: 'franchise-lead-documents/company-1/lead-1/file.pdf'
};

const propertyImageTarget: UploadStorageTarget = {
    bucket: 'property-images',
    kind: 'propertyImage',
    path: 'property-1/photo.jpg',
    propertyId: 'property-1'
};

const propertyDocumentTarget: UploadStorageTarget = {
    bucket: 'property-documents',
    kind: 'propertyDocument',
    path: 'properties/property-1/document.pdf',
    propertyId: 'property-1'
};

function pdfBytes(): Uint8Array {
    return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
}

function pngBytes(): Uint8Array {
    return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function zipBytes(): Uint8Array {
    return new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
}

test('Given lead document PDF When validating upload file Then it is accepted without public URL requirement', () => {
    assert.deepEqual(validateUploadFileForTarget(leadDocumentTarget, {
        bytes: pdfBytes(),
        fileName: 'contract.pdf',
        mimeType: 'application/pdf',
        size: pdfBytes().length
    }), { ok: true });
    assert.equal(shouldReturnUploadPublicUrl(leadDocumentTarget), false);
    assert.equal(shouldReturnUploadPublicUrl(propertyDocumentTarget), true);
});

test('Given oversized upload file When validating upload file Then it is rejected before storage upload', () => {
    assert.deepEqual(validateUploadFileForTarget(leadDocumentTarget, {
        bytes: pdfBytes(),
        fileName: 'contract.pdf',
        mimeType: 'application/pdf',
        size: MAX_UPLOAD_FILE_BYTES + 1
    }), {
        ok: false,
        error: 'File size must be 20MB or less',
        status: 413
    });
});

test('Given mismatched PDF extension and bytes When validating upload file Then it is rejected', () => {
    assert.deepEqual(validateUploadFileForTarget(leadDocumentTarget, {
        bytes: pngBytes(),
        fileName: 'contract.pdf',
        mimeType: 'application/pdf',
        size: pngBytes().length
    }), {
        ok: false,
        error: 'Unsupported file type',
        status: 400
    });
});

test('Given image document with mismatched extension When validating upload file Then it is rejected', () => {
    assert.deepEqual(validateUploadFileForTarget(leadDocumentTarget, {
        bytes: pngBytes(),
        fileName: 'contract.pdf',
        mimeType: 'image/png',
        size: pngBytes().length
    }), {
        ok: false,
        error: 'Unsupported file type',
        status: 400
    });
});

test('Given Office document upload When validating upload file Then MIME extension and signature must match', () => {
    assert.deepEqual(validateUploadFileForTarget(leadDocumentTarget, {
        bytes: zipBytes(),
        fileName: 'contract.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: zipBytes().length
    }), { ok: true });
    assert.deepEqual(validateUploadFileForTarget(leadDocumentTarget, {
        bytes: pdfBytes(),
        fileName: 'contract.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: pdfBytes().length
    }), {
        ok: false,
        error: 'Unsupported file type',
        status: 400
    });
});

test('Given property image upload When validating upload file Then only image bytes are accepted', () => {
    assert.deepEqual(validateUploadFileForTarget(propertyImageTarget, {
        bytes: pngBytes(),
        fileName: 'photo.png',
        mimeType: 'image/png',
        size: pngBytes().length
    }), { ok: true });
    assert.deepEqual(validateUploadFileForTarget(propertyImageTarget, {
        bytes: pdfBytes(),
        fileName: 'photo.pdf',
        mimeType: 'application/pdf',
        size: pdfBytes().length
    }), {
        ok: false,
        error: 'Unsupported file type',
        status: 400
    });
});
