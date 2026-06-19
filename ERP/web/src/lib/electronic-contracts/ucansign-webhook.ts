import { timingSafeEqual } from 'crypto';

export type UcansignWebhookStatus = 'completed' | 'canceled' | 'rejected' | 'deleted' | 'updated';

function safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return timingSafeEqual(leftBuffer, rightBuffer);
}

function candidateSecrets(request: Request): readonly string[] {
    const { searchParams } = new URL(request.url);
    const authorization = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const bearer = authorization.toLowerCase().startsWith('bearer ')
        ? authorization.slice(7).trim()
        : '';

    return [
        bearer,
        request.headers.get('x-ucansign-webhook-secret') || '',
        request.headers.get('x-webhook-secret') || '',
        searchParams.get('secret') || ''
    ].filter(Boolean);
}

export function isAuthorizedUcansignWebhook(request: Request, expectedSecret: string | undefined): boolean {
    if (!expectedSecret) return false;
    return candidateSecrets(request).some(candidate => safeEqual(candidate, expectedSecret));
}

export function normalizeUcansignWebhookStatus(value: string): UcansignWebhookStatus | null {
    const lower = value.toLowerCase();
    if (lower.includes('complete')) return 'completed';
    if (lower.includes('cancel')) return 'canceled';
    if (lower.includes('reject')) return 'rejected';
    if (lower.includes('trash') || lower.includes('delete')) return 'deleted';
    if (lower.includes('update') || lower.includes('send') || lower.includes('sign') || lower.includes('progress')) return 'updated';
    return null;
}
