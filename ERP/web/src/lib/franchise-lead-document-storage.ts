export type LeadDocumentStorageTarget = {
    readonly bucket: string;
    readonly path: string;
};

const DEFAULT_LEAD_DOCUMENT_STORAGE_BUCKET = 'property-documents';
const LEAD_DOCUMENT_STORAGE_PREFIX = 'franchise-lead-documents';

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPublicStoragePath(fileUrl: string, bucket: string): string {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = fileUrl.indexOf(marker);
    if (markerIndex < 0) return '';
    const rawPath = fileUrl.slice(markerIndex + marker.length).split('?')[0] || '';
    try {
        return decodeURIComponent(rawPath);
    } catch {
        return rawPath;
    }
}

export function buildLeadDocumentStorageData(input: {
    readonly storageBucket?: unknown;
    readonly storagePath?: unknown;
}): Record<string, string> | null {
    const storagePath = cleanString(input.storagePath);
    if (!storagePath) return null;
    return {
        storageBucket: cleanString(input.storageBucket) || DEFAULT_LEAD_DOCUMENT_STORAGE_BUCKET,
        storagePath
    };
}

export function buildLeadDocumentStoragePrefix(input: {
    readonly companyId: string;
    readonly leadId: string;
}): string {
    return `${LEAD_DOCUMENT_STORAGE_PREFIX}/${input.companyId}/${input.leadId}/`;
}

export function readLeadDocumentStorageTarget(input: {
    readonly sourceType?: unknown;
    readonly source_type?: unknown;
    readonly fileUrl?: unknown;
    readonly file_url?: unknown;
    readonly data?: unknown;
}): LeadDocumentStorageTarget | null {
    const sourceType = cleanString(input.sourceType ?? input.source_type);
    if (sourceType !== 'upload') return null;

    const data = isRecord(input.data) ? input.data : {};
    const bucket = cleanString(data.storageBucket ?? data.storage_bucket) || DEFAULT_LEAD_DOCUMENT_STORAGE_BUCKET;
    const storedPath = cleanString(data.storagePath ?? data.storage_path);
    const inferredPath = storedPath || readPublicStoragePath(cleanString(input.fileUrl ?? input.file_url), bucket);
    if (!inferredPath) return null;

    return {
        bucket,
        path: inferredPath
    };
}

export function readLeadDocumentScopedStorageTarget(input: {
    readonly sourceType?: unknown;
    readonly source_type?: unknown;
    readonly fileUrl?: unknown;
    readonly file_url?: unknown;
    readonly data?: unknown;
}, scope: {
    readonly companyId: string;
    readonly leadId: string;
}): LeadDocumentStorageTarget | null {
    const target = readLeadDocumentStorageTarget(input);
    if (!target) return null;
    if (target.bucket !== DEFAULT_LEAD_DOCUMENT_STORAGE_BUCKET) return null;
    if (target.path.includes('..')) return null;
    if (!target.path.startsWith(buildLeadDocumentStoragePrefix(scope))) return null;
    return target;
}
