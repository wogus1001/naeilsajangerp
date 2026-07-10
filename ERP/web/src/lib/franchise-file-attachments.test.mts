import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    isAcceptedFranchiseAttachment,
    normalizeFranchiseFileAttachments
} from './franchise-file-attachments.js';

test('Given legacy and uploaded attachment metadata When normalizing Then optional storage fields are preserved safely', () => {
    const attachments = normalizeFranchiseFileAttachments([
        { name: '도면.pdf', size: 1024, type: 'application/pdf' },
        {
            name: '현장사진.png',
            size: 2048,
            type: 'image/png',
            storageBucket: 'property-images',
            storagePath: 'property-1/photo.png',
            publicUrl: 'https://storage.test/property-1/photo.png'
        }
    ]);

    assert.deepEqual(attachments, [
        { name: '도면.pdf', size: 1024, type: 'application/pdf' },
        {
            name: '현장사진.png',
            size: 2048,
            type: 'image/png',
            storageBucket: 'property-images',
            storagePath: 'property-1/photo.png',
            publicUrl: 'https://storage.test/property-1/photo.png'
        }
    ]);
});

test('Given franchise attachment filenames When checking accepted formats Then only uploadable formats are accepted', () => {
    assert.equal(isAcceptedFranchiseAttachment('도면.pdf'), true);
    assert.equal(isAcceptedFranchiseAttachment('현장사진.webp'), true);
    assert.equal(isAcceptedFranchiseAttachment('아이폰사진.heic'), false);
});
