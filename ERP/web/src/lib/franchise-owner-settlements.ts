import {
    cleanOwnerPhase3Text,
    isOwnerPhase3StoragePath,
    OWNER_PHASE3_STORAGE,
    type OwnerSettlementStatus
} from './franchise-owner-phase3';
import {
    isAcceptedOwnerNoticeAttachmentBytes,
    isAcceptedOwnerNoticeAttachmentFileName,
    isAcceptedOwnerNoticeAttachmentMime
} from './franchise-owner-portal-attachments';

export const OWNER_SETTLEMENT_SCHEMA_MESSAGE = '점주 포털 3단계 정산·증빙 SQL이 아직 적용되지 않았습니다. supabase_franchise_owner_phase3_migration.sql을 등록해주세요.';

export type OwnerSettlementRequestRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string | null;
    readonly title: string;
    readonly instructions: string;
    readonly period_start: string;
    readonly period_end: string;
    readonly due_at: string;
    readonly status: 'open' | 'closed';
    readonly created_by: string | null;
    readonly created_at: string;
    readonly updated_at: string;
};

export type OwnerSettlementSubmissionRow = {
    readonly id: string;
    readonly request_id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly owner_account_id: string;
    readonly status: OwnerSettlementStatus;
    readonly total_amount: number | string;
    readonly note: string;
    readonly review_note: string;
    readonly submitted_at: string | null;
    readonly reviewed_by: string | null;
    readonly reviewed_at: string | null;
    readonly created_at: string;
    readonly updated_at: string;
};

export type OwnerSettlementFileRow = {
    readonly id: string;
    readonly submission_id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly owner_account_id: string;
    readonly file_name: string;
    readonly mime_type: string;
    readonly file_size: number;
    readonly storage_bucket: string;
    readonly storage_path: string;
    readonly created_at: string;
};

export type OwnerSettlementReview = {
    readonly status: 'rejected' | 'confirmed';
    readonly reviewNote: string;
};

export type OwnerSettlementFileValidation =
    | { readonly ok: true; readonly contentType: string }
    | { readonly ok: false; readonly reason: 'EMPTY' | 'TOO_LARGE' | 'INVALID_TYPE' | 'INVALID_CONTENT' };

type OwnerSettlementFileInput = {
    readonly bytes: Uint8Array;
    readonly fileName: string;
    readonly mimeType: string;
    readonly size: number;
};

type OwnerSettlementStorageInput = {
    readonly companyId: string;
    readonly locationId: string;
    readonly storageBucket: string;
    readonly storagePath: string;
    readonly submissionId: string;
};

function fileExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.slice(dotIndex + 1).trim().toLowerCase() : '';
}

function defaultMimeType(fileName: string): string {
    switch (fileExtension(fileName)) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'webp':
            return 'image/webp';
        case 'pdf':
            return 'application/pdf';
        case 'doc':
            return 'application/msword';
        case 'docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'xls':
            return 'application/vnd.ms-excel';
        case 'xlsx':
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'ppt':
            return 'application/vnd.ms-powerpoint';
        case 'pptx':
            return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        case 'hwp':
            return 'application/haansofthwp';
        case 'hwpx':
            return 'application/zip';
        default:
            return 'application/octet-stream';
    }
}

function isMimeTypeForExtension(extension: string, mimeType: string): boolean {
    switch (extension) {
        case 'jpg':
        case 'jpeg':
            return mimeType === 'image/jpeg';
        case 'png':
            return mimeType === 'image/png';
        case 'webp':
            return mimeType === 'image/webp';
        case 'pdf':
            return mimeType === 'application/pdf';
        case 'doc':
            return mimeType === 'application/msword';
        case 'docx':
            return mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'xls':
            return mimeType === 'application/vnd.ms-excel';
        case 'xlsx':
            return mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'ppt':
            return mimeType === 'application/vnd.ms-powerpoint';
        case 'pptx':
            return mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        case 'hwp':
            return ['application/haansofthwp', 'application/x-hwp', 'application/vnd.hancom.hwp'].includes(mimeType);
        case 'hwpx':
            return mimeType === 'application/zip';
        default:
            return false;
    }
}

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]): boolean {
    return signature.every((value, index) => bytes[index] === value);
}

function hasMatchingOfficeSignature(extension: string, bytes: Uint8Array): boolean {
    if (['doc', 'xls', 'ppt', 'hwp'].includes(extension)) {
        return startsWithBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    }
    if (['docx', 'xlsx', 'pptx', 'hwpx'].includes(extension)) {
        return startsWithBytes(bytes, [0x50, 0x4b]);
    }
    return true;
}

function readErrorProperty(error: unknown, key: string): string {
    if (!error || typeof error !== 'object') return '';
    const value = Reflect.get(error, key);
    return typeof value === 'string' ? value : '';
}

export function parseOwnerSettlementAmount(value: unknown): string | null {
    const raw = typeof value === 'number'
        ? (Number.isFinite(value) ? String(value) : '')
        : cleanOwnerPhase3Text(value);
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw)) return null;
    const [rawInteger = '', rawFraction = ''] = raw.replace(/,/g, '').split('.');
    const integer = rawInteger.replace(/^0+(?=\d)/, '');
    if (integer.length > 16) return null;
    return `${integer}.${rawFraction.padEnd(2, '0')}`;
}

export function isOwnerSettlementRequestTarget(requestLocationId: string | null, ownerLocationId: string): boolean {
    return requestLocationId === null || requestLocationId === ownerLocationId;
}

export function isOwnerSettlementMutableStatus(value: unknown): value is 'draft' | 'rejected' {
    return value === 'draft' || value === 'rejected';
}

export function isOwnerSettlementFileStoragePath(input: OwnerSettlementStorageInput): boolean {
    return input.storageBucket === OWNER_PHASE3_STORAGE.bucket
        && isOwnerPhase3StoragePath({
            companyId: input.companyId,
            locationId: input.locationId,
            path: input.storagePath,
            sourceType: 'settlement'
        })
        && input.storagePath.startsWith(`settlement/${input.companyId}/${input.locationId}/${input.submissionId}/`);
}

export function parseOwnerSettlementReview(action: unknown, reviewNote: unknown): OwnerSettlementReview | null {
    const normalizedAction = cleanOwnerPhase3Text(action);
    const normalizedNote = cleanOwnerPhase3Text(reviewNote);
    if (normalizedAction === 'reject') {
        return normalizedNote ? { status: 'rejected', reviewNote: normalizedNote } : null;
    }
    return normalizedAction === 'confirm'
        ? { status: 'confirmed', reviewNote: normalizedNote }
        : null;
}

export function validateOwnerSettlementFile(input: OwnerSettlementFileInput): OwnerSettlementFileValidation {
    if (!Number.isSafeInteger(input.size) || input.size <= 0) return { ok: false, reason: 'EMPTY' };
    if (input.size > OWNER_PHASE3_STORAGE.maxFileSizeBytes) return { ok: false, reason: 'TOO_LARGE' };
    if (!isAcceptedOwnerNoticeAttachmentFileName(input.fileName)) return { ok: false, reason: 'INVALID_TYPE' };
    const declaredMime = cleanOwnerPhase3Text(input.mimeType).toLowerCase();
    const contentType = !declaredMime || declaredMime === 'application/octet-stream'
        ? defaultMimeType(input.fileName)
        : declaredMime;
    const extension = fileExtension(input.fileName);
    if (!isAcceptedOwnerNoticeAttachmentMime(input.fileName, contentType)
        || !isMimeTypeForExtension(extension, contentType)) {
        return { ok: false, reason: 'INVALID_TYPE' };
    }
    if (!isAcceptedOwnerNoticeAttachmentBytes(input.fileName, input.bytes)
        || !hasMatchingOfficeSignature(extension, input.bytes)) {
        return { ok: false, reason: 'INVALID_CONTENT' };
    }
    return { ok: true, contentType };
}

export function isMissingOwnerSettlementSchemaError(error: unknown): boolean {
    const code = readErrorProperty(error, 'code').toUpperCase();
    const text = [
        error instanceof Error ? error.message : typeof error === 'string' ? error : '',
        readErrorProperty(error, 'message'),
        readErrorProperty(error, 'details'),
        readErrorProperty(error, 'hint')
    ].join(' ').toLowerCase();
    if (text.includes('bucket not found')) return true;
    const namesSettlementDependency = /franchise_owner_settlement_|franchise_owner_portal_events|franchise-owner-private/.test(text);
    if (!namesSettlementDependency) return false;
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code)
        || /schema cache|does not exist|could not find|undefined table|undefined column/.test(text);
}
