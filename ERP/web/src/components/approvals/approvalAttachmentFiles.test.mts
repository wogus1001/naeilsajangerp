import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    APPROVAL_ATTACHMENT_MAX_BYTES,
    formatApprovalAttachmentSize,
    mergeApprovalAttachmentFiles
} from './approvalAttachmentFiles.js';

function file(name: string, size = 1024, lastModified = 1): File {
    return new File([new Uint8Array(size)], name, { lastModified });
}

test('Given valid business files When merging attachments Then all files are retained', () => {
    const result = mergeApprovalAttachmentFiles({
        current: [file('existing.pdf')],
        selected: [file('사진.png'), file('문서.hwpx')]
    });

    assert.deepEqual(result.files.map(item => item.name), ['existing.pdf', '사진.png', '문서.hwpx']);
    assert.equal(result.message, '');
});

test('Given invalid, oversized, and duplicate files When merging Then only valid unique files remain', () => {
    const existing = file('existing.pdf');
    const result = mergeApprovalAttachmentFiles({
        current: [existing],
        selected: [existing, file('script.exe'), file('large.pdf', APPROVAL_ATTACHMENT_MAX_BYTES + 1), file('valid.xlsx')]
    });

    assert.deepEqual(result.files.map(item => item.name), ['existing.pdf', 'valid.xlsx']);
    assert.match(result.message, /지원하지 않는 파일 형식/);
    assert.match(result.message, /10MB/);
    assert.match(result.message, /이미 선택한 파일/);
});

test('Given saved attachments When adding files Then the five file limit includes saved files', () => {
    const result = mergeApprovalAttachmentFiles({
        current: [file('new-1.pdf')],
        existingCount: 3,
        selected: [file('new-2.pdf'), file('new-3.pdf')]
    });

    assert.deepEqual(result.files.map(item => item.name), ['new-1.pdf', 'new-2.pdf']);
    assert.match(result.message, /최대 5개/);
});

test('Given byte sizes When formatting Then compact Korean-friendly units are returned', () => {
    assert.equal(formatApprovalAttachmentSize(512), '512B');
    assert.equal(formatApprovalAttachmentSize(2048), '2KB');
    assert.equal(formatApprovalAttachmentSize(1024 * 1024), '1.0MB');
});
