import {
    getFranchiseAttachmentKey,
    type FranchiseFileAttachment
} from '@/lib/franchise-file-attachments';
import type { PropertyRegistrationFileAttachment } from '@/lib/franchise-property-registration';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';

const PROPERTY_IMAGE_BUCKET = 'property-images';
const PROPERTY_DOCUMENT_BUCKET = 'property-documents';
const UPLOADABLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const UPLOADABLE_DOCUMENT_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
] as const;

type UploadResult = {
    readonly path?: string;
    readonly publicUrl?: string;
};

type PropertyRegistrationUploadPathInput = {
    readonly propertyId: string;
    readonly fileName: string;
    readonly bucket: string;
    readonly timestamp?: number;
    readonly suffix?: string;
};

function sanitizePathPart(value: string): string {
    const trimmed = value.trim();
    const extensionStart = trimmed.lastIndexOf('.');
    const rawBaseName = extensionStart > 0 ? trimmed.slice(0, extensionStart) : trimmed;
    const rawExtension = extensionStart > 0 ? trimmed.slice(extensionStart) : '';
    const baseName = rawBaseName
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'file';
    const extension = /^\.[a-zA-Z0-9]+$/.test(rawExtension) ? rawExtension.toLowerCase() : '';
    return `${baseName}${extension}`;
}

export function buildPropertyRegistrationUploadPath(input: PropertyRegistrationUploadPathInput): string {
    const timestamp = input.timestamp ?? Date.now();
    const normalizedSuffix = input.suffix || Math.random().toString(36).slice(2, 10) || 'upload';
    const storedFileName = `${timestamp}-${normalizedSuffix}-${sanitizePathPart(input.fileName)}`;
    return input.bucket === PROPERTY_IMAGE_BUCKET
        ? `${input.propertyId}/${storedFileName}`
        : `properties/${input.propertyId}/${storedFileName}`;
}

function buildUploadPath(propertyId: string, file: File, bucket: string): string {
    return buildPropertyRegistrationUploadPath({ propertyId, fileName: file.name, bucket });
}

export function getPropertyRegistrationUploadBucket(file: Pick<File, 'type'>): string {
    if (isUploadableImage(file)) return PROPERTY_IMAGE_BUCKET;
    if (UPLOADABLE_DOCUMENT_TYPES.some(type => type === file.type)) return PROPERTY_DOCUMENT_BUCKET;
    return '';
}

function fileAttachmentFor(file: File): FranchiseFileAttachment {
    return {
        name: file.name,
        size: file.size,
        type: file.type
    };
}

function isUploadableImage(file: Pick<File, 'type'>): boolean {
    return UPLOADABLE_IMAGE_TYPES.some(type => type === file.type);
}

export function isPreviewablePropertyAttachment(attachment: PropertyRegistrationFileAttachment): boolean {
    return Boolean(attachment.publicUrl)
        && UPLOADABLE_IMAGE_TYPES.some(type => type === attachment.type);
}

export function isOpenablePropertyAttachment(attachment: PropertyRegistrationFileAttachment): boolean {
    return Boolean(attachment.publicUrl);
}

async function uploadPropertyAttachment(propertyId: string, file: File, bucket: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('path', buildUploadPath(propertyId, file, bucket));

    const response = await fetch('/api/upload', {
        body: formData,
        headers: await getApiAuthHeaders(),
        method: 'POST'
    });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<UploadResult>(payload);
}

export async function uploadPropertyRegistrationAttachments(input: {
    readonly propertyId: string;
    readonly files: readonly File[];
    readonly attachments: readonly PropertyRegistrationFileAttachment[];
}): Promise<readonly PropertyRegistrationFileAttachment[]> {
    if (input.files.length === 0) return input.attachments;
    const unsupportedFile = input.files.find(file => !getPropertyRegistrationUploadBucket(file));
    if (unsupportedFile) {
        throw new Error(`${unsupportedFile.name} 파일 형식은 업로드할 수 없습니다.`);
    }

    const uploadedByKey = new Map<string, PropertyRegistrationFileAttachment>();
    for (const file of input.files) {
        const storageBucket = getPropertyRegistrationUploadBucket(file);
        const uploadResult = await uploadPropertyAttachment(input.propertyId, file, storageBucket);
        const storagePath = uploadResult.path || '';
        const publicUrl = uploadResult.publicUrl || '';
        if (!storagePath || !publicUrl) {
            throw new Error(`${file.name} 파일의 저장 정보를 확인하지 못했습니다.`);
        }
        const attachment = fileAttachmentFor(file);
        uploadedByKey.set(getFranchiseAttachmentKey(attachment), {
            ...attachment,
            storageBucket,
            storagePath,
            publicUrl
        });
    }

    if (uploadedByKey.size === 0) return input.attachments;

    return input.attachments.map(attachment => (
        uploadedByKey.get(getFranchiseAttachmentKey(attachment)) || attachment
    ));
}
