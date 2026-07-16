import type { FranchiseFileAttachment } from '@/lib/franchise-file-attachments';
import { cleanText } from './deleted-record-details';

export type DeletedEditContext = {
    readonly row: Record<string, unknown>;
    readonly data: Record<string, unknown>;
    readonly managerId: string;
    readonly authorId: string;
    readonly createdAt: string;
};

export function readBoolean(data: Record<string, unknown>, key: string, fallback = false): boolean {
    const value = data[key];
    return typeof value === 'boolean' ? value : fallback;
}

export function readNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const text = cleanText(value).replace(/,/g, '');
    if (!text) return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
}

export function toManwonInput(value: unknown): string {
    const number = readNullableNumber(value);
    return number === null ? '' : String(Math.round(number / 10_000));
}

export function toDatetimeInput(value: unknown): string {
    const text = cleanText(value);
    if (!text) return '';
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return '';
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function rebuildDeletedAttachmentUrls(
    attachments: readonly FranchiseFileAttachment[],
    sourceId: string
): readonly FranchiseFileAttachment[] {
    const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!configuredUrl) return attachments.map(({ publicUrl: _publicUrl, ...attachment }) => attachment);

    let storageOrigin = '';
    try {
        storageOrigin = new URL(configuredUrl).origin;
    } catch {
        return attachments.map(({ publicUrl: _publicUrl, ...attachment }) => attachment);
    }

    return attachments.map(({ publicUrl: archivedPublicUrl, ...attachment }) => {
        const bucket = attachment.storageBucket;
        const path = attachment.storagePath;
        const pathSegments = path?.split('/') || [];
        const isSafePath = pathSegments.length > 1
            && pathSegments.every(segment => segment.length > 0 && segment !== '.' && segment !== '..');
        const expectedPrefix = bucket === 'property-images'
            ? `${sourceId}/`
            : bucket === 'property-documents'
                ? `properties/${sourceId}/`
                : '';
        if (bucket || path) {
            if (!bucket || !path || !isSafePath || !expectedPrefix || !path.startsWith(expectedPrefix)) {
                return attachment;
            }
            const encodedPath = pathSegments.map(segment => encodeURIComponent(segment)).join('/');
            return {
                ...attachment,
                publicUrl: `${storageOrigin}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`
            };
        }

        if (!archivedPublicUrl) return attachment;
        try {
            const archivedUrl = new URL(archivedPublicUrl);
            const publicObjectPrefix = '/storage/v1/object/public/';
            const encodedSegments = archivedUrl.pathname.startsWith(publicObjectPrefix)
                ? archivedUrl.pathname.slice(publicObjectPrefix.length).split('/')
                : [];
            const decodedSegments = encodedSegments.map(segment => decodeURIComponent(segment));
            const hasUnsafeSegment = decodedSegments.some(segment => !segment || segment === '.' || segment === '..');
            const belongsToSource = decodedSegments[0] === 'property-images'
                ? decodedSegments[1] === sourceId && decodedSegments.length > 2
                : decodedSegments[0] === 'property-documents'
                    && decodedSegments[1] === 'properties'
                    && decodedSegments[2] === sourceId
                    && decodedSegments.length > 3;
            const isTrustedStoredObject = archivedUrl.origin === storageOrigin
                && !hasUnsafeSegment
                && belongsToSource;
            return isTrustedStoredObject ? { ...attachment, publicUrl: archivedUrl.toString() } : attachment;
        } catch {
            return attachment;
        }
    });
}
