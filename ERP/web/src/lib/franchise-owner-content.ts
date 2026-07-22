import {
    isAcceptedOwnerNoticeAttachmentBytes,
    isAcceptedOwnerNoticeAttachmentFileName,
    isAcceptedOwnerNoticeAttachmentMime
} from '@/lib/franchise-owner-portal-attachments';
import { isOwnerPhase3Uuid } from '@/lib/franchise-owner-phase3';

export const OWNER_CONTENT_SCHEMA_MESSAGE = '점주 포털 3단계 콘텐츠 라이브러리 SQL이 아직 적용되지 않았습니다. supabase_franchise_owner_phase3_migration.sql을 등록해주세요.';

export const OWNER_CONTENT_STORAGE = {
    bucket: 'franchise-owner-private',
    globalLocationSegment: 'global',
    maxFileCount: 10,
    maxFileSizeBytes: 10 * 1024 * 1024,
    signedUrlTtlSeconds: 60 * 5
} as const;

export const OWNER_CONTENT_TYPES = [
    'education',
    'manual',
    'official_document',
    'corrective_action',
    'contract_document'
] as const;

export type OwnerContentType = typeof OWNER_CONTENT_TYPES[number];
export type OwnerContentStatus = 'draft' | 'published' | 'archived';

export type OwnerContentItemRow = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string | null;
    readonly source_type: string;
    readonly source_id: string | null;
    readonly content_type: OwnerContentType;
    readonly category: string;
    readonly title: string;
    readonly summary: string;
    readonly body: string;
    readonly version: number;
    readonly status: OwnerContentStatus;
    readonly requires_acknowledgement: boolean;
    readonly due_at: string | null;
    readonly published_at: string | null;
    readonly created_by: string | null;
    readonly updated_by: string | null;
    readonly created_at: string;
    readonly updated_at: string;
};

export const OWNER_CONTENT_RECEIPT_SELECT = 'id, content_id, company_id, location_id, owner_account_id, acknowledged_at, created_at' as const;
export const OWNER_CONTENT_RECEIPT_ON_CONFLICT = 'content_id,owner_account_id' as const;

export type OwnerContentReceiptRow = {
    readonly id: string;
    readonly content_id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly owner_account_id: string;
    readonly acknowledged_at: string;
    readonly created_at: string;
};

export type OwnerContentReceiptTargetAccount = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly status: string | null;
};

export type OwnerContentReceiptStats = {
    readonly targetCount: number;
    readonly acknowledgedCount: number;
    readonly unacknowledgedCount: number;
};

export type OwnerContentAttachmentRow = {
    readonly id: string;
    readonly content_id: string;
    readonly company_id: string;
    readonly file_name: string;
    readonly mime_type: string;
    readonly file_size: number;
    readonly storage_bucket: string;
    readonly storage_path: string;
    readonly created_by: string | null;
    readonly created_at: string;
};

export type OwnerContentCreateInput = {
    readonly body: string;
    readonly category: string;
    readonly contentType: OwnerContentType;
    readonly dueAt: string | null;
    readonly locationId: string | null;
    readonly requiresAcknowledgement: boolean;
    readonly summary: string;
    readonly title: string;
};

export type OwnerContentPublishAction = 'archive' | 'publish';

type OwnerContentFileInput = {
    readonly bytes: Uint8Array;
    readonly fileName: string;
    readonly mimeType: string;
    readonly size: number;
};

export type OwnerContentAttachmentValidation =
    | { readonly ok: true; readonly contentType: string }
    | { readonly ok: false; readonly reason: 'EMPTY' | 'TOO_LARGE' | 'INVALID_TYPE' | 'INVALID_CONTENT' };

type OwnerContentStorageScope = {
    readonly companyId: string;
    readonly contentId: string;
    readonly locationId: string | null;
};

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isContentType(value: string): value is OwnerContentType {
    return OWNER_CONTENT_TYPES.some(contentType => contentType === value);
}

function needsLocation(contentType: OwnerContentType): boolean {
    return contentType === 'corrective_action' || contentType === 'contract_document';
}

function parseOptionalDate(value: unknown): string | null | undefined {
    const raw = cleanText(value);
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function safeFileName(fileName: string): string {
    const trimmed = fileName.trim();
    const dotIndex = trimmed.lastIndexOf('.');
    const extension = dotIndex > 0
        ? trimmed.slice(dotIndex + 1).replace(/[^0-9A-Za-z]+/g, '').toLowerCase().slice(0, 12)
        : '';
    const rawBase = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
    const base = rawBase.normalize('NFKD')
        .replace(/[^0-9A-Za-z._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
        .slice(0, 80) || 'content-file';
    return extension ? `${base}.${extension}` : base;
}

function fileExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.slice(dotIndex + 1).trim().toLowerCase() : '';
}

function defaultMimeType(extension: string): string {
    const mimeTypes: Readonly<Record<string, string>> = {
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        hwp: 'application/haansofthwp',
        hwpx: 'application/zip',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        pdf: 'application/pdf',
        png: 'image/png',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        webp: 'image/webp',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return mimeTypes[extension] || 'application/octet-stream';
}

function isMimeForExtension(extension: string, mimeType: string): boolean {
    if (extension === 'hwp') {
        return ['application/haansofthwp', 'application/x-hwp', 'application/vnd.hancom.hwp'].includes(mimeType);
    }
    return defaultMimeType(extension) === mimeType;
}

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]): boolean {
    return signature.every((value, index) => bytes[index] === value);
}

function hasOfficeContainerForExtension(extension: string, bytes: Uint8Array): boolean {
    if (['doc', 'hwp', 'ppt', 'xls'].includes(extension)) {
        return startsWithBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0]);
    }
    if (['docx', 'hwpx', 'pptx', 'xlsx'].includes(extension)) {
        return startsWithBytes(bytes, [0x50, 0x4b]);
    }
    return true;
}

function readErrorProperty(error: unknown, key: string): string {
    if (!error || typeof error !== 'object') return '';
    const value = Reflect.get(error, key);
    return typeof value === 'string' ? value : '';
}

export function canOwnerReadContent(
    item: Pick<OwnerContentItemRow, 'company_id' | 'location_id' | 'status'>,
    companyId: string,
    locationId: string
): boolean {
    return item.company_id === companyId
        && item.status === 'published'
        && (item.location_id === null || item.location_id === locationId);
}

export function parseOwnerContentReceiptAction(value: unknown): 'acknowledge' | null {
    if (!isRecord(value)) return null;
    const action = cleanText(value.action || value.status).toLowerCase();
    return action === 'acknowledge' ? 'acknowledge' : null;
}

export function mergeOwnerContentAcknowledgedAt<
    T extends Pick<OwnerContentItemRow, 'id' | 'requires_acknowledgement'>
>(
    items: readonly T[],
    receipts: readonly Pick<OwnerContentReceiptRow, 'content_id' | 'owner_account_id' | 'acknowledged_at'>[],
    ownerAccountId: string
): readonly (T & { readonly acknowledged_at: string | null })[] {
    const acknowledgedAtByContentId = new Map(
        receipts
            .filter(receipt => receipt.owner_account_id === ownerAccountId)
            .map(receipt => [receipt.content_id, receipt.acknowledged_at] as const)
    );
    return items.map(item => ({
        ...item,
        acknowledged_at: item.requires_acknowledgement
            ? acknowledgedAtByContentId.get(item.id) || null
            : null
    }));
}

export function targetOwnerAccountIdsForContent(
    item: Pick<OwnerContentItemRow, 'location_id'>,
    companyId: string,
    accounts: readonly OwnerContentReceiptTargetAccount[]
): readonly string[] {
    const targetIds = new Set<string>();
    for (const account of accounts) {
        if (account.company_id !== companyId || account.status !== 'active') continue;
        if (item.location_id !== null && account.location_id !== item.location_id) continue;
        targetIds.add(account.id);
    }
    return [...targetIds];
}

export function summarizeOwnerContentReceiptStats(
    contentId: string,
    targetOwnerAccountIds: readonly string[],
    receipts: readonly Pick<OwnerContentReceiptRow, 'content_id' | 'owner_account_id' | 'acknowledged_at'>[]
): OwnerContentReceiptStats {
    const targetIds = new Set(targetOwnerAccountIds);
    const acknowledgedIds = new Set(
        receipts
            .filter(receipt => receipt.content_id === contentId
                && targetIds.has(receipt.owner_account_id)
                && Boolean(receipt.acknowledged_at))
            .map(receipt => receipt.owner_account_id)
    );
    const targetCount = targetIds.size;
    const acknowledgedCount = acknowledgedIds.size;
    return {
        targetCount,
        acknowledgedCount,
        unacknowledgedCount: targetCount - acknowledgedCount
    };
}

export function parseOwnerContentCreate(value: unknown):
    | { readonly ok: true; readonly input: OwnerContentCreateInput }
    | { readonly ok: false; readonly message: string } {
    if (!isRecord(value)) return { ok: false, message: '콘텐츠 내용을 입력해주세요.' };
    const contentTypeRaw = cleanText(value.contentType || value.content_type);
    if (!isContentType(contentTypeRaw)) return { ok: false, message: '콘텐츠 유형을 확인해주세요.' };
    const title = cleanText(value.title);
    if (!title) return { ok: false, message: '콘텐츠 제목을 입력해주세요.' };
    const locationId = cleanText(value.locationId || value.location_id) || null;
    if (locationId && !isOwnerPhase3Uuid(locationId)) return { ok: false, message: '운영점 정보를 확인해주세요.' };
    if (needsLocation(contentTypeRaw) && !locationId) {
        return { ok: false, message: '이 콘텐츠 유형은 운영점을 선택해야 합니다.' };
    }
    const dueAt = parseOptionalDate(value.dueAt || value.due_at);
    if (dueAt === undefined) return { ok: false, message: '마감 일시를 확인해주세요.' };
    return {
        ok: true,
        input: {
            body: cleanText(value.body),
            category: cleanText(value.category),
            contentType: contentTypeRaw,
            dueAt,
            locationId,
            requiresAcknowledgement: value.requiresAcknowledgement === true || value.requires_acknowledgement === true,
            summary: cleanText(value.summary),
            title
        }
    };
}

export function parseOwnerContentAction(value: unknown): OwnerContentPublishAction | null {
    if (!isRecord(value)) return null;
    const action = cleanText(value.action || value.status).toLowerCase();
    if (action === 'publish' || action === 'published') return 'publish';
    if (action === 'archive' || action === 'archived') return 'archive';
    return null;
}

export function buildOwnerContentStoragePath(
    scope: OwnerContentStorageScope & { readonly fileName: string; readonly uniqueId?: string }
): string | null {
    if (!isOwnerPhase3Uuid(scope.companyId) || !isOwnerPhase3Uuid(scope.contentId)) return null;
    if (scope.locationId && !isOwnerPhase3Uuid(scope.locationId)) return null;
    const uniqueId = cleanText(scope.uniqueId) || crypto.randomUUID();
    if (!isOwnerPhase3Uuid(uniqueId)) return null;
    const locationSegment = scope.locationId || OWNER_CONTENT_STORAGE.globalLocationSegment;
    return ['content', scope.companyId, locationSegment, scope.contentId, `${uniqueId}-${safeFileName(scope.fileName)}`].join('/');
}

export function isOwnerContentStoragePath(
    scope: OwnerContentStorageScope & { readonly storageBucket: string; readonly storagePath: string }
): boolean {
    if (scope.storageBucket !== OWNER_CONTENT_STORAGE.bucket) return false;
    const parts = scope.storagePath.split('/');
    if (parts.length !== 5 || parts[0] !== 'content') return false;
    const expectedLocation = scope.locationId || OWNER_CONTENT_STORAGE.globalLocationSegment;
    const objectName = parts[4] || '';
    const objectId = objectName.slice(0, 36);
    const fileName = objectName.slice(37);
    return parts[1] === scope.companyId
        && parts[2] === expectedLocation
        && parts[3] === scope.contentId
        && isOwnerPhase3Uuid(parts[1])
        && (parts[2] === OWNER_CONTENT_STORAGE.globalLocationSegment || isOwnerPhase3Uuid(parts[2]))
        && isOwnerPhase3Uuid(parts[3])
        && isOwnerPhase3Uuid(objectId)
        && objectName[36] === '-'
        && /^[0-9A-Za-z][0-9A-Za-z._-]{0,127}$/.test(fileName)
        && !fileName.includes('..');
}

export function validateOwnerContentAttachment(input: OwnerContentFileInput): OwnerContentAttachmentValidation {
    if (!Number.isSafeInteger(input.size) || input.size <= 0) return { ok: false, reason: 'EMPTY' };
    if (input.size > OWNER_CONTENT_STORAGE.maxFileSizeBytes) return { ok: false, reason: 'TOO_LARGE' };
    if (!isAcceptedOwnerNoticeAttachmentFileName(input.fileName)) return { ok: false, reason: 'INVALID_TYPE' };
    const extension = fileExtension(input.fileName);
    const declaredMime = input.mimeType.trim().toLowerCase();
    const contentType = !declaredMime || declaredMime === 'application/octet-stream'
        ? defaultMimeType(extension)
        : declaredMime;
    if (!isAcceptedOwnerNoticeAttachmentMime(input.fileName, contentType)
        || !isMimeForExtension(extension, contentType)) {
        return { ok: false, reason: 'INVALID_TYPE' };
    }
    if (!isAcceptedOwnerNoticeAttachmentBytes(input.fileName, input.bytes)
        || !hasOfficeContainerForExtension(extension, input.bytes)) {
        return { ok: false, reason: 'INVALID_CONTENT' };
    }
    return { ok: true, contentType };
}

export function isMissingOwnerContentSchemaError(error: unknown): boolean {
    const code = readErrorProperty(error, 'code').toUpperCase();
    const text = [
        error instanceof Error ? error.message : typeof error === 'string' ? error : '',
        readErrorProperty(error, 'message'),
        readErrorProperty(error, 'details'),
        readErrorProperty(error, 'hint')
    ].join(' ').toLowerCase();
    if (text.includes('bucket not found')) return true;
    if (!/franchise_owner_content_|franchise-owner-private/.test(text)) return false;
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code)
        || /schema cache|does not exist|could not find|undefined table|undefined column/.test(text);
}
