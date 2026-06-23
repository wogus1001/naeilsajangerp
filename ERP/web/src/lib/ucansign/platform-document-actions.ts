import { isRecord } from './platform-response';
import {
    uCanSignPlatformClient,
    UcansignPlatformError
} from './platform-client';

export type PlatformDocumentViewEmbeddingInput = {
    readonly documentId: string;
    readonly redirectUrl: string;
    readonly participantId?: string;
};

export function platformDocumentViewEndpoint(documentId: string): string {
    return `/embedding/view/${encodeURIComponent(documentId)}`;
}

export function platformDocumentCancellationEndpoint(documentId: string): string {
    return `/documents/${encodeURIComponent(documentId)}/request/cancellation`;
}

function firstUrl(value: unknown): string {
    if (typeof value === 'string' && /^https?:\/\//.test(value)) return value;
    if (Array.isArray(value)) {
        for (const item of value) {
            const nestedUrl = firstUrl(item);
            if (nestedUrl) return nestedUrl;
        }
        return '';
    }
    if (!isRecord(value)) return '';
    for (const item of Object.values(value)) {
        const nestedUrl = firstUrl(item);
        if (nestedUrl) return nestedUrl;
    }
    return '';
}

function embeddingUrlFromResponse(response: unknown): string {
    const url = firstUrl(response);
    if (!url) throw new UcansignPlatformError('API_ERROR', 'UCanSign document access URL is missing');
    return url;
}

export async function createPlatformDocumentViewEmbedding(
    input: PlatformDocumentViewEmbeddingInput
): Promise<string> {
    const body = input.participantId
        ? { participantId: input.participantId, redirectUrl: input.redirectUrl }
        : { redirectUrl: input.redirectUrl };

    const response = await uCanSignPlatformClient(platformDocumentViewEndpoint(input.documentId), {
        method: 'POST',
        body: JSON.stringify(body)
    });
    return embeddingUrlFromResponse(response);
}

export async function cancelPlatformDocumentRequest(
    documentId: string,
    message: string
): Promise<unknown> {
    return uCanSignPlatformClient(platformDocumentCancellationEndpoint(documentId), {
        method: 'POST',
        body: JSON.stringify({ message })
    });
}
