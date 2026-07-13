import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApprovalPdfInput, createApprovalPdfTemplate } from './pdf-template.js';

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
