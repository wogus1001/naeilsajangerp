import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApprovalPdfInput, createApprovalPdfTemplate, paginateApprovalBody } from './pdf-template.js';

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
