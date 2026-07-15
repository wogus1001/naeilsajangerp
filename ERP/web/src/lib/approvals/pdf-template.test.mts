import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import {
    createApprovalPdfDownloadResponse,
    createApprovalPdfInput,
    createApprovalPdfTemplate,
    paginateApprovalBody
} from './pdf-template.js';

function trueTypeHasCodePoint(font: Buffer, codePoint: number): boolean {
    const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
    const tableCount = view.getUint16(4);
    let cmapOffset = 0;
    for (let index = 0; index < tableCount; index += 1) {
        const recordOffset = 12 + index * 16;
        const tag = font.subarray(recordOffset, recordOffset + 4).toString('ascii');
        if (tag === 'cmap') cmapOffset = view.getUint32(recordOffset + 8);
    }
    if (!cmapOffset) return false;
    const subtableCount = view.getUint16(cmapOffset + 2);
    for (let index = 0; index < subtableCount; index += 1) {
        const recordOffset = cmapOffset + 4 + index * 8;
        const subtableOffset = cmapOffset + view.getUint32(recordOffset + 4);
        if (view.getUint16(subtableOffset) !== 12) continue;
        const groupCount = view.getUint32(subtableOffset + 12);
        for (let group = 0; group < groupCount; group += 1) {
            const groupOffset = subtableOffset + 16 + group * 12;
            if (codePoint >= view.getUint32(groupOffset) && codePoint <= view.getUint32(groupOffset + 4)) return true;
        }
    }
    return false;
}

void test('Given the approval PDF font When loading the bundled asset Then it uses a PDF-compatible TrueType font', async () => {
    const font = await readFile(path.join(process.cwd(), 'public', 'fonts', 'noto-sans-kr-400.ttf'));

    assert.deepEqual([...font.subarray(0, 4)], [0x00, 0x01, 0x00, 0x00]);
    for (const character of '한글문서') {
        assert.equal(trueTypeHasCodePoint(font, character.codePointAt(0) || 0), true, `${character} glyph is missing`);
    }
});

void test('Given multiple body chunks When creating a PDF template Then every chunk receives its own A4 page', () => {
    const template = createApprovalPdfTemplate(3);
    const input = createApprovalPdfInput(['첫 페이지', '둘째 페이지', '셋째 페이지'], '제목', '문서 정보');

    assert.equal(typeof template.basePdf, 'object');
    assert.equal(template.schemas.length, 3);
    assert.equal(input.body_0, '첫 페이지');
    assert.equal(input.body_2, '셋째 페이지');
    assert.equal(input.footer_2, 'FC ERP 전자결재 문서 · 3/3');
});

void test('Given an invalid page count When creating a PDF template Then generation is rejected', () => {
    assert.throws(() => createApprovalPdfTemplate(0), /at least one page/);
});

void test('Given one hundred short body lines When paginating Then rendered line capacity creates three pages', () => {
    const pages = paginateApprovalBody(Array.from({ length: 100 }, (_, index) => `항목 ${index + 1}`).join('\n'));

    assert.equal(pages.length, 3);
    assert.equal(pages[0]?.split('\n').length, 34);
    assert.equal(pages[2]?.split('\n').length, 22);
});

void test('Given a long Korean line When paginating Then width wrapping is included in page calculation', () => {
    const pages = paginateApprovalBody('가'.repeat(45 * 35));

    assert.equal(pages.length, 2);
});

void test('Given a generated PDF When downloading Then its bytes and download headers are preserved', async () => {
    const pdf = new Uint8Array(Buffer.from('%PDF-download'));

    const response = createApprovalPdfDownloadResponse(pdf, '12345678-1234-1234-1234-123456789012', '한글 문서');

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    assert.match(response.headers.get('content-disposition') || '', /filename\*=UTF-8''/);
    const downloaded = new Uint8Array(await response.arrayBuffer());
    assert.equal(downloaded.byteLength, pdf.byteLength);
    assert.deepEqual(downloaded, pdf);
});

void test('Given punctuation in a PDF title When downloading Then the UTF-8 filename is RFC 8187 encoded', () => {
    const response = createApprovalPdfDownloadResponse(
        new Uint8Array(Buffer.from('%PDF-')),
        '12345678-1234-1234-1234-123456789012',
        "계약 검토(최종)'본"
    );

    const disposition = response.headers.get('content-disposition') || '';
    assert.match(disposition, /%28%EC%B5%9C%EC%A2%85%29%27/);
    assert.doesNotMatch(disposition, /filename\*=UTF-8''[^;]*[()']/);
});
