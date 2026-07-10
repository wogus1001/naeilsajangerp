import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildPropertyRegistrationUploadPath,
    getPropertyRegistrationUploadBucket,
    isOpenablePropertyAttachment,
    isPreviewablePropertyAttachment
} from './franchise-property-registration-uploads.js';

test('Given property image attachments When resolving upload target Then property-images path is used', () => {
    assert.equal(getPropertyRegistrationUploadBucket({ type: 'image/png' }), 'property-images');
    assert.equal(
        buildPropertyRegistrationUploadPath({
            propertyId: 'property-1',
            fileName: '현장 사진.png',
            bucket: 'property-images',
            timestamp: 1234,
            suffix: 'qa'
        }),
        'property-1/1234-qa-file.png'
    );
});

test('Given property PDF attachments When resolving upload target Then property-documents path is used', () => {
    assert.equal(getPropertyRegistrationUploadBucket({ type: 'application/pdf' }), 'property-documents');
    assert.equal(
        buildPropertyRegistrationUploadPath({
            propertyId: 'property-1',
            fileName: '도면.pdf',
            bucket: 'property-documents',
            timestamp: 1234,
            suffix: 'qa'
        }),
        'properties/property-1/1234-qa-file.pdf'
    );
});

test('Given unsupported HEIC attachments When resolving upload target Then no upload bucket is returned', () => {
    assert.equal(getPropertyRegistrationUploadBucket({ type: 'image/heic' }), '');
});

test('Given stored attachment URL When rendering attachment Then image preview and open states are distinct', () => {
    assert.equal(isOpenablePropertyAttachment({
        name: '도면.pdf',
        size: 1024,
        type: 'application/pdf',
        publicUrl: 'https://storage.test/properties/property-1/file.pdf'
    }), true);
    assert.equal(isPreviewablePropertyAttachment({
        name: '도면.pdf',
        size: 1024,
        type: 'application/pdf',
        publicUrl: 'https://storage.test/properties/property-1/file.pdf'
    }), false);
    assert.equal(isPreviewablePropertyAttachment({
        name: '사진.png',
        size: 1024,
        type: 'image/png',
        publicUrl: 'https://storage.test/property-1/file.png'
    }), true);
});
