export const OWNER_PHASE3_SOURCE_TYPES = [
    'checklist_issue',
    'content_item',
    'settlement_request',
    'settlement_submission'
] as const;

export const OWNER_CONTENT_TYPES = [
    'education',
    'manual',
    'official_document',
    'corrective_action',
    'contract_document'
] as const;

export const OWNER_CONTENT_STATUSES = ['draft', 'published', 'archived'] as const;
export const OWNER_SETTLEMENT_STATUSES = ['draft', 'submitted', 'rejected', 'confirmed'] as const;

export type OwnerPhase3SourceType = typeof OWNER_PHASE3_SOURCE_TYPES[number];
export type OwnerContentType = typeof OWNER_CONTENT_TYPES[number];
export type OwnerContentStatus = typeof OWNER_CONTENT_STATUSES[number];
export type OwnerSettlementStatus = typeof OWNER_SETTLEMENT_STATUSES[number];

export type OwnerPhase3ScopedSource = {
    readonly companyId: string;
    readonly locationId: string | null;
    readonly ownerAccountId: string | null;
    readonly sourceType: OwnerPhase3SourceType;
    readonly sourceId: string;
};

export const OWNER_PHASE3_STORAGE = {
    bucket: 'franchise-owner-private',
    maxFileCount: 10,
    maxFileSizeBytes: 10 * 1024 * 1024,
    signedUrlTtlSeconds: 60 * 5
} as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_FILE_EXTENSION_PATTERN = /^(pdf|jpe?g|png|webp|docx?|xlsx?|pptx?|hwp|hwpx)$/i;

export function cleanOwnerPhase3Text(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function parseOwnerPhase3DateTime(value: unknown): string | null {
    const text = cleanOwnerPhase3Text(value);
    if (!text) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/.test(text)
        ? `${text}+09:00`
        : text;
    const timestamp = Date.parse(normalized);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function isOwnerPhase3Uuid(value: unknown): value is string {
    return UUID_PATTERN.test(cleanOwnerPhase3Text(value));
}

export function isOwnerPhase3SourceType(value: unknown): value is OwnerPhase3SourceType {
    return OWNER_PHASE3_SOURCE_TYPES.includes(cleanOwnerPhase3Text(value) as OwnerPhase3SourceType);
}

export function isOwnerContentType(value: unknown): value is OwnerContentType {
    return OWNER_CONTENT_TYPES.includes(cleanOwnerPhase3Text(value) as OwnerContentType);
}

export function buildOwnerPhase3SourceKey(source: OwnerPhase3ScopedSource): string {
    return `${source.companyId}:${source.sourceType}:${source.sourceId}`;
}

function buildSafeFileName(fileName: string): string {
    const normalized = cleanOwnerPhase3Text(fileName);
    const extension = normalized.split('.').pop()?.toLowerCase() || '';
    if (!SAFE_FILE_EXTENSION_PATTERN.test(extension)) return '';
    const baseName = normalized.slice(0, -(extension.length + 1))
        .normalize('NFKD')
        .replace(/[^0-9A-Za-z._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
        .slice(0, 80) || 'owner-file';
    return `${baseName}.${extension}`;
}

export function buildOwnerPhase3StoragePath(input: {
    readonly companyId: string;
    readonly fileName: string;
    readonly locationId: string;
    readonly sourceId: string;
    readonly sourceType: 'content' | 'settlement';
    readonly uniqueId?: string;
}): string | null {
    if (![input.companyId, input.locationId, input.sourceId].every(isOwnerPhase3Uuid)) return null;
    const safeFileName = buildSafeFileName(input.fileName);
    if (!safeFileName) return null;
    const uniqueId = cleanOwnerPhase3Text(input.uniqueId) || crypto.randomUUID();
    if (!isOwnerPhase3Uuid(uniqueId)) return null;
    return [input.sourceType, input.companyId, input.locationId, input.sourceId, `${uniqueId}-${safeFileName}`].join('/');
}

export function isOwnerPhase3StoragePath(input: {
    readonly companyId: string;
    readonly locationId?: string | null;
    readonly path: string;
    readonly sourceType?: 'content' | 'settlement';
}): boolean {
    const parts = cleanOwnerPhase3Text(input.path).split('/');
    if (parts.length !== 5) return false;
    if (!['content', 'settlement'].includes(parts[0] || '')) return false;
    if (input.sourceType && parts[0] !== input.sourceType) return false;
    if (parts[1] !== input.companyId) return false;
    if (input.locationId && parts[2] !== input.locationId) return false;
    return isOwnerPhase3Uuid(parts[1]) && isOwnerPhase3Uuid(parts[2]) && isOwnerPhase3Uuid(parts[3]);
}

export function canTransitionOwnerSettlementStatus(
    currentStatus: OwnerSettlementStatus,
    nextStatus: OwnerSettlementStatus
): boolean {
    if (currentStatus === nextStatus) return true;
    if (currentStatus === 'draft') return nextStatus === 'submitted';
    if (currentStatus === 'submitted') return nextStatus === 'rejected' || nextStatus === 'confirmed';
    return currentStatus === 'rejected' && nextStatus === 'submitted';
}
