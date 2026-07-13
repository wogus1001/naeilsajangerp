import { BLANK_A4_PDF, type Template } from '@pdfme/common';

type TextSchema = {
    readonly name: string;
    readonly type: 'text';
    readonly position: { readonly x: number; readonly y: number };
    readonly width: number;
    readonly height: number;
    readonly fontName: string;
    readonly fontSize: number;
    readonly lineHeight?: number;
    readonly alignment?: 'left' | 'center' | 'right';
};

function firstPageSchemas(index: number): TextSchema[] {
    return [
        { name: 'heading', type: 'text', position: { x: 20, y: 18 }, width: 170, height: 16, fontName: 'NotoSansKR', fontSize: 20, alignment: 'center' },
        { name: 'meta', type: 'text', position: { x: 20, y: 42 }, width: 170, height: 30, fontName: 'NotoSansKR', fontSize: 9, lineHeight: 1.5 },
        { name: `body_${index}`, type: 'text', position: { x: 20, y: 78 }, width: 170, height: 188, fontName: 'NotoSansKR', fontSize: 10, lineHeight: 1.55 },
        { name: `footer_${index}`, type: 'text', position: { x: 20, y: 276 }, width: 170, height: 8, fontName: 'NotoSansKR', fontSize: 8, alignment: 'center' }
    ];
}

function continuationPageSchemas(index: number): TextSchema[] {
    return [
        { name: `body_${index}`, type: 'text', position: { x: 20, y: 20 }, width: 170, height: 246, fontName: 'NotoSansKR', fontSize: 10, lineHeight: 1.55 },
        { name: `footer_${index}`, type: 'text', position: { x: 20, y: 276 }, width: 170, height: 8, fontName: 'NotoSansKR', fontSize: 8, alignment: 'center' }
    ];
}

export function createApprovalPdfTemplate(pageCount: number): Template {
    if (!Number.isInteger(pageCount) || pageCount < 1) {
        throw new Error('Approval PDF requires at least one page');
    }
    return {
        basePdf: BLANK_A4_PDF,
        schemas: Array.from({ length: pageCount }, (_, index) => (
            index === 0 ? firstPageSchemas(index) : continuationPageSchemas(index)
        ))
    };
}

export function createApprovalPdfInput(
    chunks: readonly string[],
    heading: string,
    meta: string
): Record<string, string> {
    const input: Record<string, string> = { heading, meta };
    chunks.forEach((chunk, index) => {
        input[`body_${index}`] = chunk;
        input[`footer_${index}`] = `FC ERP 전자결재 문서 · ${index + 1}/${chunks.length}`;
    });
    return input;
}
