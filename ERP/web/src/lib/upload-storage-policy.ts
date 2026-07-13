const PROPERTY_IMAGES_BUCKET = 'property-images';
const PROPERTY_DOCUMENTS_BUCKET = 'property-documents';
export const SUPERVISION_REPORT_BUCKET = 'franchise-supervision-private';
const LEAD_DOCUMENT_PREFIX = 'franchise-lead-documents';
const DISCLOSURE_PREFIX = 'franchise-disclosures';
const VENDOR_CONTRACT_PREFIX = 'franchise-vendor-contracts';
const SUPERVISION_PREFIX = 'franchise-supervision';
const PROPERTY_DOCUMENT_PREFIX = 'properties';

type UploadBucket = typeof PROPERTY_IMAGES_BUCKET | typeof PROPERTY_DOCUMENTS_BUCKET | typeof SUPERVISION_REPORT_BUCKET;

type BaseUploadTarget = {
    readonly bucket: UploadBucket;
    readonly path: string;
};

export type UploadStorageTarget =
    | (BaseUploadTarget & {
        readonly kind: 'propertyImage';
        readonly propertyId: string;
    })
    | (BaseUploadTarget & {
        readonly kind: 'propertyDocument';
        readonly propertyId: string;
    })
    | (BaseUploadTarget & {
        readonly kind: 'leadDocument';
        readonly companyId: string;
        readonly leadId: string;
    })
    | (BaseUploadTarget & {
        readonly kind: 'disclosure';
        readonly companyId: string;
    })
    | (BaseUploadTarget & {
        readonly kind: 'vendorContract';
        readonly companyId: string;
        readonly contractId: string;
    })
    | (BaseUploadTarget & {
        readonly kind: 'supervisionReport';
        readonly companyId: string;
        readonly reportId: string;
    });

export type UploadStorageParseResult =
    | {
        readonly ok: true;
        readonly target: UploadStorageTarget;
    }
    | {
        readonly ok: false;
        readonly error: string;
    };

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function readPathSegments(path: string): readonly string[] | null {
    if (!path || path.startsWith('/') || path.includes('\\') || path.includes('..')) return null;
    const segments = path.split('/');
    if (segments.some(segment => {
        if (segment.trim().length === 0) return true;
        try {
            let decoded = segment;
            for (let depth = 0; depth < 3; depth += 1) {
                const next = decodeURIComponent(decoded);
                if (next === '.' || next === '..' || next.includes('/') || next.includes('\\')) return true;
                if (next === decoded) break;
                decoded = next;
            }
            return false;
        } catch {
            return true;
        }
    })) return null;
    return segments;
}

function isUploadBucket(value: string): value is UploadBucket {
    return value === PROPERTY_IMAGES_BUCKET || value === PROPERTY_DOCUMENTS_BUCKET || value === SUPERVISION_REPORT_BUCKET;
}

export function parseUploadStorageTarget(input: {
    readonly bucket?: unknown;
    readonly companyId?: unknown;
    readonly path?: unknown;
}): UploadStorageParseResult {
    const bucket = cleanString(input.bucket) || PROPERTY_IMAGES_BUCKET;
    if (!isUploadBucket(bucket)) return { ok: false, error: 'Invalid upload bucket' };

    const path = cleanString(input.path);
    const segments = readPathSegments(path);
    if (!segments) return { ok: false, error: 'Invalid upload path' };

    if (bucket === PROPERTY_IMAGES_BUCKET) {
        if (segments.length < 2) return { ok: false, error: 'Invalid property image storage path' };
        return {
            ok: true,
            target: {
                bucket,
                kind: 'propertyImage',
                path,
                propertyId: segments[0]
            }
        };
    }

    if (bucket === SUPERVISION_REPORT_BUCKET && segments[0] !== SUPERVISION_PREFIX) {
        return { ok: false, error: 'Unsupported upload path' };
    }

    if (segments[0] === PROPERTY_DOCUMENT_PREFIX) {
        if (segments.length < 3) return { ok: false, error: 'Invalid property document storage path' };
        return {
            ok: true,
            target: {
                bucket,
                kind: 'propertyDocument',
                path,
                propertyId: segments[1]
            }
        };
    }

    if (segments[0] === LEAD_DOCUMENT_PREFIX) {
        if (segments.length < 4) return { ok: false, error: 'Invalid lead document storage path' };
        return {
            ok: true,
            target: {
                bucket,
                companyId: segments[1],
                kind: 'leadDocument',
                leadId: segments[2],
                path
            }
        };
    }

    if (segments[0] === DISCLOSURE_PREFIX) {
        if (segments.length < 3) return { ok: false, error: 'Invalid disclosure storage path' };
        const companyId = cleanString(input.companyId);
        if (!companyId || companyId !== segments[1]) {
            return { ok: false, error: 'Invalid disclosure storage path' };
        }
        return {
            ok: true,
            target: {
                bucket,
                companyId,
                kind: 'disclosure',
                path
            }
        };
    }

    if (segments[0] === VENDOR_CONTRACT_PREFIX) {
        if (segments.length < 4) return { ok: false, error: 'Invalid vendor contract storage path' };
        const companyId = cleanString(input.companyId);
        if (!companyId || companyId !== segments[1]) {
            return { ok: false, error: 'Invalid vendor contract storage path' };
        }
        return {
            ok: true,
            target: {
                bucket,
                companyId,
                contractId: segments[2],
                kind: 'vendorContract',
                path
            }
        };
    }

    if (segments[0] === SUPERVISION_PREFIX) {
        if (bucket !== SUPERVISION_REPORT_BUCKET) {
            return { ok: false, error: 'Invalid supervision report storage bucket' };
        }
        if (segments.length < 4) return { ok: false, error: 'Invalid supervision report storage path' };
        const companyId = cleanString(input.companyId);
        if (!companyId || companyId !== segments[1]) {
            return { ok: false, error: 'Invalid supervision report storage path' };
        }
        return {
            ok: true,
            target: {
                bucket,
                companyId,
                kind: 'supervisionReport',
                path,
                reportId: segments[2]
            }
        };
    }

    return { ok: false, error: 'Unsupported upload path' };
}

export function isSupervisionReportStoragePath(input: {
    readonly companyId: string;
    readonly path: string;
    readonly reportId: string;
}): boolean {
    const parsed = parseUploadStorageTarget({
        bucket: SUPERVISION_REPORT_BUCKET,
        companyId: input.companyId,
        path: input.path
    });
    return parsed.ok &&
        parsed.target.kind === 'supervisionReport' &&
        parsed.target.companyId === input.companyId &&
        parsed.target.reportId === input.reportId;
}
