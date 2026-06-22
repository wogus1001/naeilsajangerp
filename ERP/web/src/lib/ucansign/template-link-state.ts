import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_TTL_MS = 30 * 60 * 1000;

export type UcansignTemplateLinkState = {
    readonly templateId: string;
    readonly versionId: string;
    readonly expiresAt: number;
};

function requiredSecret(explicitSecret?: string): string {
    const secret = explicitSecret
        || process.env.UCANSIGN_TEMPLATE_LINK_SECRET
        || process.env.UCANSIGN_WEBHOOK_SECRET
        || process.env.UCANSIGN_API_KEY;
    if (!secret) throw new Error('UCANSIGN_TEMPLATE_LINK_SECRET or UCANSIGN_API_KEY is required');
    return secret;
}

function encode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('base64url');
}

function isStateRecord(value: unknown): value is UcansignTemplateLinkState {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    if (!('templateId' in value) || !('versionId' in value) || !('expiresAt' in value)) return false;
    return typeof value.templateId === 'string'
        && typeof value.versionId === 'string'
        && typeof value.expiresAt === 'number';
}

export function createUcansignTemplateLinkState(
    input: { readonly templateId: string; readonly versionId: string; readonly ttlMs?: number },
    explicitSecret?: string
): string {
    const payload = encode(JSON.stringify({
        templateId: input.templateId,
        versionId: input.versionId,
        expiresAt: Date.now() + (input.ttlMs || DEFAULT_TTL_MS)
    }));
    return `${payload}.${sign(payload, requiredSecret(explicitSecret))}`;
}

export function verifyUcansignTemplateLinkState(
    state: string,
    explicitSecret?: string,
    now = Date.now()
): UcansignTemplateLinkState | null {
    const [payload, signature] = state.split('.');
    if (!payload || !signature) return null;

    const expected = sign(payload, requiredSecret(explicitSecret));
    const expectedBuffer = Buffer.from(expected, 'base64url');
    const signatureBuffer = Buffer.from(signature, 'base64url');
    if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
        return null;
    }

    const parsed: unknown = JSON.parse(decode(payload));
    if (!isStateRecord(parsed) || parsed.expiresAt < now) return null;
    return parsed;
}
