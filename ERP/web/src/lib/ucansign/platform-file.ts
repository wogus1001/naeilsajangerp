import JSZip from 'jszip';

export type PlatformDocumentFile = {
    readonly content: ArrayBuffer;
    readonly contentType: string;
    readonly fileName: string;
};

type ExtractedPdf = {
    readonly content: ArrayBuffer;
    readonly fileName: string;
};

const PDF_SIGNATURE = '%PDF-';

function bytesStartWith(value: ArrayBuffer, signature: readonly number[]): boolean {
    const bytes = new Uint8Array(value);
    if (bytes.length < signature.length) return false;
    return signature.every((byte, index) => bytes[index] === byte);
}

function isPdfContent(value: ArrayBuffer): boolean {
    return Buffer.from(value).subarray(0, PDF_SIGNATURE.length).toString('utf8') === PDF_SIGNATURE;
}

function isZipContent(value: ArrayBuffer): boolean {
    return bytesStartWith(value, [0x50, 0x4b, 0x03, 0x04]);
}

function ensureExtension(fileName: string, extension: string): string {
    const trimmedName = fileName.trim() || '전자계약';
    return trimmedName.toLowerCase().endsWith(extension) ? trimmedName : `${trimmedName}${extension}`;
}

async function extractLargestPdfFromZip(content: ArrayBuffer, fileNameHint: string): Promise<ExtractedPdf | null> {
    const zip = await JSZip.loadAsync(content);
    const pdfEntries = Object.values(zip.files)
        .filter(entry => !entry.dir && entry.name.toLowerCase().endsWith('.pdf'));
    let selected: ExtractedPdf | null = null;
    for (const entry of pdfEntries) {
        const pdfContent = await entry.async('arraybuffer');
        if (!isPdfContent(pdfContent)) continue;
        if (!selected || pdfContent.byteLength > selected.content.byteLength) {
            selected = {
                content: pdfContent,
                fileName: ensureExtension(fileNameHint, '.pdf')
            };
        }
    }
    return selected;
}

export async function normalizePlatformDocumentFile(
    file: PlatformDocumentFile,
    fileNameHint = ''
): Promise<PlatformDocumentFile> {
    const preferredName = fileNameHint || file.fileName || '전자계약';
    if (isPdfContent(file.content)) {
        return {
            ...file,
            contentType: 'application/pdf',
            fileName: ensureExtension(preferredName, '.pdf')
        };
    }
    if (!isZipContent(file.content)) return file;

    const extractedPdf = await extractLargestPdfFromZip(file.content, preferredName);
    if (extractedPdf) {
        return {
            content: extractedPdf.content,
            contentType: 'application/pdf',
            fileName: extractedPdf.fileName
        };
    }

    return {
        ...file,
        contentType: 'application/zip',
        fileName: ensureExtension(preferredName, '.zip')
    };
}
