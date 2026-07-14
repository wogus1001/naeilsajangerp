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

const FIRST_PAGE_BODY_LINES = 34;
const CONTINUATION_BODY_LINES = 44;
const BODY_LINE_WIDTH = 45;
const PDF_STREAM_CHUNK_BYTES = 64 * 1024;

function characterWidth(character: string): number {
    return /^[\u0000-\u00ff]$/.test(character) ? 0.55 : 1;
}

function wrappedBodyLines(value: string): readonly string[] {
    return value.split('\n').flatMap(sourceLine => {
        if (!sourceLine) return [''];
        const lines: string[] = [];
        let line = '';
        let width = 0;
        for (const character of sourceLine) {
            const nextWidth = characterWidth(character);
            if (line && width + nextWidth > BODY_LINE_WIDTH) {
                lines.push(line.trimEnd());
                line = '';
                width = 0;
            }
            line += character;
            width += nextWidth;
        }
        lines.push(line.trimEnd());
        return lines;
    });
}

export function paginateApprovalBody(value: string): readonly string[] {
    const lines = wrappedBodyLines(value);
    const pages: string[] = [];
    let offset = 0;
    let capacity = FIRST_PAGE_BODY_LINES;
    while (offset < lines.length) {
        pages.push(lines.slice(offset, offset + capacity).join('\n'));
        offset += capacity;
        capacity = CONTINUATION_BODY_LINES;
    }
    return pages.length > 0 ? pages : [''];
}

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

export function createApprovalPdfDownloadResponse(
    pdf: Uint8Array,
    documentId: string,
    documentTitle: string
): Response {
    let offset = 0;
    const body = new ReadableStream<Uint8Array>({
        pull(controller) {
            if (offset >= pdf.byteLength) {
                controller.close();
                return;
            }
            const nextOffset = Math.min(offset + PDF_STREAM_CHUNK_BYTES, pdf.byteLength);
            controller.enqueue(pdf.subarray(offset, nextOffset));
            offset = nextOffset;
        }
    });
    const asciiName = `approval-${documentId.slice(0, 8)}.pdf`;
    const encodedName = encodeURIComponent(`${documentTitle}.pdf`).replace(
        /[!'()*]/g,
        character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    );
    return new Response(body, {
        headers: {
            'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
            'Content-Type': 'application/pdf',
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff'
        }
    });
}
