import { uCanSignPlatformClient } from './platform-client';

export function platformDocumentCancellationEndpoint(documentId: string): string {
    return `/documents/${encodeURIComponent(documentId)}/request/cancellation`;
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
