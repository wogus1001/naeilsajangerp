import type { SupervisionPhotoAttachment } from '@/lib/franchise-supervision';
import { isSupervisionReportStoragePath, SUPERVISION_REPORT_BUCKET } from '@/lib/upload-storage-policy';

type AttachmentRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AttachmentRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function readSupervisionPhotoAttachments(
    value: unknown,
    input: { readonly companyId: string; readonly reportId: string },
    getSignedUrl: (path: string) => string
): readonly SupervisionPhotoAttachment[] {
    if (!Array.isArray(value)) return [];

    return value.filter(isRecord).map(item => {
        const path = cleanString(item.path);
        return {
            name: cleanString(item.name),
            path,
            storageBucket: cleanString(item.storageBucket),
            size: Number(item.size) || 0,
            contentType: cleanString(item.contentType)
        };
    }).filter(item => item.name
        && item.path
        && item.storageBucket === SUPERVISION_REPORT_BUCKET
        && isSupervisionReportStoragePath({ ...input, path: item.path }))
        .map(item => ({ ...item, publicUrl: getSignedUrl(item.path) }));
}
