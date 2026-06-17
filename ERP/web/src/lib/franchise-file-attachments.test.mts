import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    formatFranchiseFileSize,
    isAcceptedFranchiseAttachment,
    normalizeFranchiseFileAttachments,
    normalizeFranchiseFileNames
} from './franchise-file-attachments.js';

test('normalizeFranchiseFileAttachments keeps safe attachment metadata', () => {
    const attachments = normalizeFranchiseFileAttachments([
        { name: ' 도면.pdf ', size: '1024', type: ' application/pdf ' },
        { name: '', size: 10, type: 'image/png' },
        'invalid'
    ]);

    assert.deepEqual(attachments, [
        { name: '도면.pdf', size: 1024, type: 'application/pdf' }
    ]);
    assert.deepEqual(normalizeFranchiseFileNames([], attachments), ['도면.pdf']);
});

test('isAcceptedFranchiseAttachment allows only configured property documents and images', () => {
    assert.equal(isAcceptedFranchiseAttachment('매장사진.JPG'), true);
    assert.equal(isAcceptedFranchiseAttachment('계약서.exe'), false);
    assert.equal(formatFranchiseFileSize(10 * 1024 * 1024), '10MB');
});
