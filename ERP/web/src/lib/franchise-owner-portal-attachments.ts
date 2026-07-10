export const OWNER_NOTICE_ATTACHMENT_POLICY = {
    maxFiles: 5,
    maxFileSizeBytes: 10 * 1024 * 1024,
    acceptedExtensions: [
        '.pdf',
        '.doc',
        '.docx',
        '.xls',
        '.xlsx',
        '.ppt',
        '.pptx',
        '.hwp',
        '.hwpx',
        '.jpg',
        '.jpeg',
        '.png',
        '.webp'
    ],
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf'
} as const;

export const OWNER_NOTICE_ATTACHMENT_STORAGE = {
    bucket: 'property-documents',
    prefix: 'franchise-owner-notices'
} as const;

export type OwnerNoticeAttachment = {
    readonly name: string;
    readonly mimeType: string;
    readonly size: number;
    readonly storageBucket: string;
    readonly storagePath: string;
    readonly downloadUrl?: string;
};

type OwnerNoticeAttachmentFileKind = 'image-jpeg' | 'image-png' | 'image-webp' | 'pdf' | 'office-document';

function cleanOwnerString(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function isOwnerRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOwnerFileSize(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
    const parsed = Number(cleanOwnerString(value).replace(/,/g, ''));
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function getOwnerNoticeAttachmentExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

function getOwnerNoticeAttachmentFileKind(fileName: string): OwnerNoticeAttachmentFileKind | null {
    const extension = getOwnerNoticeAttachmentExtension(fileName);
    if (extension === '.jpg' || extension === '.jpeg') return 'image-jpeg';
    if (extension === '.png') return 'image-png';
    if (extension === '.webp') return 'image-webp';
    if (extension === '.pdf') return 'pdf';
    if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.hwp', '.hwpx'].includes(extension)) return 'office-document';
    return null;
}

export function isAcceptedOwnerNoticeAttachmentFileName(fileName: string): boolean {
    const extension = getOwnerNoticeAttachmentExtension(fileName);
    return OWNER_NOTICE_ATTACHMENT_POLICY.acceptedExtensions.some(acceptedExtension => acceptedExtension === extension);
}

export function isAcceptedOwnerNoticeAttachmentMime(fileName: string, mimeType: string): boolean {
    const kind = getOwnerNoticeAttachmentFileKind(fileName);
    const mime = cleanOwnerString(mimeType).toLowerCase();
    if (!kind || !mime || mime === 'application/octet-stream') return Boolean(kind);
    if (kind === 'image-jpeg') return mime === 'image/jpeg';
    if (kind === 'image-png') return mime === 'image/png';
    if (kind === 'image-webp') return mime === 'image/webp';
    if (kind === 'pdf') return mime === 'application/pdf';
    return [
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/haansofthwp',
        'application/x-hwp',
        'application/vnd.hancom.hwp',
        'application/zip'
    ].includes(mime);
}

function readOwnerNoticeAttachmentByte(bytes: Uint8Array, index: number): number {
    return bytes[index] ?? -1;
}

export function isAcceptedOwnerNoticeAttachmentBytes(fileName: string, bytes: Uint8Array): boolean {
    const kind = getOwnerNoticeAttachmentFileKind(fileName);
    if (!kind) return false;
    if (kind === 'image-jpeg') {
        return readOwnerNoticeAttachmentByte(bytes, 0) === 0xff
            && readOwnerNoticeAttachmentByte(bytes, 1) === 0xd8
            && readOwnerNoticeAttachmentByte(bytes, 2) === 0xff;
    }
    if (kind === 'image-png') {
        return readOwnerNoticeAttachmentByte(bytes, 0) === 0x89
            && readOwnerNoticeAttachmentByte(bytes, 1) === 0x50
            && readOwnerNoticeAttachmentByte(bytes, 2) === 0x4e
            && readOwnerNoticeAttachmentByte(bytes, 3) === 0x47;
    }
    if (kind === 'image-webp') {
        return readOwnerNoticeAttachmentByte(bytes, 0) === 0x52
            && readOwnerNoticeAttachmentByte(bytes, 1) === 0x49
            && readOwnerNoticeAttachmentByte(bytes, 2) === 0x46
            && readOwnerNoticeAttachmentByte(bytes, 3) === 0x46
            && readOwnerNoticeAttachmentByte(bytes, 8) === 0x57
            && readOwnerNoticeAttachmentByte(bytes, 9) === 0x45
            && readOwnerNoticeAttachmentByte(bytes, 10) === 0x42
            && readOwnerNoticeAttachmentByte(bytes, 11) === 0x50;
    }
    if (kind === 'pdf') {
        return readOwnerNoticeAttachmentByte(bytes, 0) === 0x25
            && readOwnerNoticeAttachmentByte(bytes, 1) === 0x50
            && readOwnerNoticeAttachmentByte(bytes, 2) === 0x44
            && readOwnerNoticeAttachmentByte(bytes, 3) === 0x46
            && readOwnerNoticeAttachmentByte(bytes, 4) === 0x2d;
    }
    const isZip = readOwnerNoticeAttachmentByte(bytes, 0) === 0x50 && readOwnerNoticeAttachmentByte(bytes, 1) === 0x4b;
    const isOle = readOwnerNoticeAttachmentByte(bytes, 0) === 0xd0
        && readOwnerNoticeAttachmentByte(bytes, 1) === 0xcf
        && readOwnerNoticeAttachmentByte(bytes, 2) === 0x11
        && readOwnerNoticeAttachmentByte(bytes, 3) === 0xe0;
    return isZip || isOle;
}

function normalizeOwnerNoticeAttachment(value: unknown): OwnerNoticeAttachment | null {
    if (!isOwnerRecord(value)) return null;
    const name = cleanOwnerString(value.name);
    const storageBucket = cleanOwnerString(value.storageBucket);
    const storagePath = cleanOwnerString(value.storagePath);
    if (!name || !storageBucket || !storagePath || !isAcceptedOwnerNoticeAttachmentFileName(name)) return null;
    return {
        name,
        mimeType: cleanOwnerString(value.mimeType) || 'application/octet-stream',
        size: readOwnerFileSize(value.size),
        storageBucket,
        storagePath
    };
}

export function normalizeOwnerNoticeAttachments(value: unknown): readonly OwnerNoticeAttachment[] {
    if (!Array.isArray(value)) return [];
    return value
        .map(normalizeOwnerNoticeAttachment)
        .filter((attachment): attachment is OwnerNoticeAttachment => attachment !== null)
        .slice(0, OWNER_NOTICE_ATTACHMENT_POLICY.maxFiles);
}

export function isOwnerNoticeAttachmentStoragePath(companyId: string, bucket: string, storagePath: string): boolean {
    const safeCompanyId = cleanOwnerString(companyId);
    return bucket === OWNER_NOTICE_ATTACHMENT_STORAGE.bucket
        && safeCompanyId.length > 0
        && storagePath.startsWith(`${OWNER_NOTICE_ATTACHMENT_STORAGE.prefix}/${safeCompanyId}/`);
}

export function selectOwnerNoticeAttachmentsForCompany(input: {
    readonly companyId: string;
    readonly attachments: unknown;
}): readonly OwnerNoticeAttachment[] {
    return normalizeOwnerNoticeAttachments(input.attachments).filter(attachment => (
        isOwnerNoticeAttachmentStoragePath(input.companyId, attachment.storageBucket, attachment.storagePath)
    ));
}

export function resolveOwnerNoticeAttachmentsForCompany(input: {
    readonly companyId: string;
    readonly attachments: unknown;
    readonly getDownloadUrl: (bucket: string, storagePath: string) => string;
}): readonly OwnerNoticeAttachment[] {
    return selectOwnerNoticeAttachmentsForCompany(input).map(attachment => ({
        ...attachment,
        downloadUrl: input.getDownloadUrl(attachment.storageBucket, attachment.storagePath)
    }));
}

export function buildOwnerNoticeAttachmentDownloadUrl(storagePath: string): string {
    return `/api/owner/notices/attachments?storagePath=${encodeURIComponent(storagePath)}`;
}

export function buildOwnerPortalNoticeAttachmentDownloadUrl(storagePath: string): string {
    return `/api/franchise-owner-portal/notices/attachments?storagePath=${encodeURIComponent(storagePath)}`;
}
