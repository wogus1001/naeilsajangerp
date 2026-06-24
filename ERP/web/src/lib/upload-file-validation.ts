import type { UploadStorageTarget } from '@/lib/upload-storage-policy';

export const MAX_UPLOAD_FILE_BYTES = 20 * 1024 * 1024;

type UploadFileInput = {
    readonly bytes: Uint8Array;
    readonly fileName: string;
    readonly mimeType: string;
    readonly size: number;
};

export type UploadFileValidationResult =
    | {
        readonly ok: true;
    }
    | {
        readonly ok: false;
        readonly error: string;
        readonly status: number;
    };

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const DOCUMENT_MIME_TYPES = [
    'application/pdf',
    ...IMAGE_MIME_TYPES,
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const;

function normalizeText(value: string): string {
    return value.trim().toLowerCase();
}

function fileExtension(fileName: string): string {
    const normalized = normalizeText(fileName);
    const lastDotIndex = normalized.lastIndexOf('.');
    return lastDotIndex >= 0 ? normalized.slice(lastDotIndex + 1) : '';
}

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]): boolean {
    if (bytes.length < signature.length) return false;
    return signature.every((value, index) => bytes[index] === value);
}

function hasPdfSignature(bytes: Uint8Array): boolean {
    return startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46]);
}

function hasJpegSignature(bytes: Uint8Array): boolean {
    return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
}

function hasPngSignature(bytes: Uint8Array): boolean {
    return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function hasWebpSignature(bytes: Uint8Array): boolean {
    return startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46])
        && bytes[8] === 0x57
        && bytes[9] === 0x45
        && bytes[10] === 0x42
        && bytes[11] === 0x50;
}

function hasZipSignature(bytes: Uint8Array): boolean {
    return startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04])
        || startsWithBytes(bytes, [0x50, 0x4b, 0x05, 0x06])
        || startsWithBytes(bytes, [0x50, 0x4b, 0x07, 0x08]);
}

function hasOleSignature(bytes: Uint8Array): boolean {
    return startsWithBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
}

function isOneOf<T extends readonly string[]>(value: string, choices: T): value is T[number] {
    return choices.includes(value);
}

function validateImageSignature(mimeType: string, bytes: Uint8Array): boolean {
    switch (mimeType) {
        case 'image/jpeg':
            return hasJpegSignature(bytes);
        case 'image/png':
            return hasPngSignature(bytes);
        case 'image/webp':
            return hasWebpSignature(bytes);
        default:
            return false;
    }
}

function validateImageExtension(mimeType: string, extension: string): boolean {
    switch (mimeType) {
        case 'image/jpeg':
            return extension === 'jpg' || extension === 'jpeg';
        case 'image/png':
            return extension === 'png';
        case 'image/webp':
            return extension === 'webp';
        default:
            return false;
    }
}

function isValidOfficeDocument(input: UploadFileInput): boolean {
    const extension = fileExtension(input.fileName);
    const mimeType = normalizeText(input.mimeType);
    switch (extension) {
        case 'doc':
            return mimeType === 'application/msword' && hasOleSignature(input.bytes);
        case 'docx':
            return mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                && hasZipSignature(input.bytes);
        case 'xls':
            return mimeType === 'application/vnd.ms-excel' && hasOleSignature(input.bytes);
        case 'xlsx':
            return mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                && hasZipSignature(input.bytes);
        default:
            return false;
    }
}

function isValidDocument(input: UploadFileInput): boolean {
    const mimeType = normalizeText(input.mimeType);
    const extension = fileExtension(input.fileName);
    if (!isOneOf(mimeType, DOCUMENT_MIME_TYPES)) return false;
    if (mimeType === 'application/pdf') return extension === 'pdf' && hasPdfSignature(input.bytes);
    if (isOneOf(mimeType, IMAGE_MIME_TYPES)) {
        return validateImageExtension(mimeType, extension) && validateImageSignature(mimeType, input.bytes);
    }
    return isValidOfficeDocument(input);
}

function isValidImage(input: UploadFileInput): boolean {
    const mimeType = normalizeText(input.mimeType);
    return isOneOf(mimeType, IMAGE_MIME_TYPES)
        && validateImageExtension(mimeType, fileExtension(input.fileName))
        && validateImageSignature(mimeType, input.bytes);
}

export function shouldReturnUploadPublicUrl(target: UploadStorageTarget): boolean {
    return target.kind === 'propertyImage'
        || target.kind === 'propertyDocument'
        || target.kind === 'disclosure';
}

export function validateUploadFileForTarget(
    target: UploadStorageTarget,
    input: UploadFileInput
): UploadFileValidationResult {
    if (input.size > MAX_UPLOAD_FILE_BYTES) {
        return {
            ok: false,
            error: 'File size must be 20MB or less',
            status: 413
        };
    }

    const isValid = target.bucket === 'property-images'
        ? isValidImage(input)
        : isValidDocument(input);
    if (!isValid) {
        return {
            ok: false,
            error: 'Unsupported file type',
            status: 400
        };
    }

    return { ok: true };
}
