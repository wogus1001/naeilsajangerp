import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const DEMO_ACCESS_COOKIE_NAME = 'demo_access';
export const DEMO_ACCESS_TTL_SECONDS = 8 * 60 * 60;

export type DemoAccessConfig = {
    readonly id: string;
    readonly password: string;
    readonly secret: string;
};

type DemoAccessCredentials = {
    readonly id: string;
    readonly password: string;
};

type DemoAccessPayload = {
    readonly expiresAt: number;
    readonly issuedAt: number;
    readonly nonce: string;
    readonly subject: 'demo';
    readonly version: 'v1';
};

type JsonRecord = Record<string, unknown>;

function hasConfiguredText(value: string | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDemoAccessPayload(value: unknown): value is DemoAccessPayload {
    return isRecord(value)
        && value.subject === 'demo'
        && value.version === 'v1'
        && typeof value.nonce === 'string'
        && Number.isInteger(value.issuedAt)
        && Number.isInteger(value.expiresAt);
}

function signPayload(encodedPayload: string, secret: string): string {
    return createHmac('sha256', secret)
        .update(encodedPayload)
        .digest('base64url');
}

function secureStringEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function decodePayload(encodedPayload: string): DemoAccessPayload | null {
    try {
        const parsed: unknown = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        return isDemoAccessPayload(parsed) ? parsed : null;
    } catch (error) {
        if (error instanceof SyntaxError || error instanceof TypeError) return null;
        throw error;
    }
}

export function readDemoAccessConfig(env: Partial<NodeJS.ProcessEnv> = process.env): DemoAccessConfig | null {
    const id = env.DEMO_ACCESS_ID;
    const password = env.DEMO_ACCESS_PASSWORD;
    const secret = env.DEMO_ACCESS_COOKIE_SECRET;

    if (!hasConfiguredText(id) || !hasConfiguredText(password) || !hasConfiguredText(secret)) {
        return null;
    }

    return {
        id: id.trim(),
        password: password.trim(),
        secret: secret.trim()
    };
}

export function verifyDemoCredentials(input: DemoAccessCredentials, config: DemoAccessConfig): boolean {
    return secureStringEqual(input.id, config.id) && secureStringEqual(input.password, config.password);
}

export function createDemoAccessToken(config: DemoAccessConfig, nowMs = Date.now()): string {
    const nowSeconds = Math.floor(nowMs / 1_000);
    const payload: DemoAccessPayload = {
        expiresAt: nowSeconds + DEMO_ACCESS_TTL_SECONDS,
        issuedAt: nowSeconds,
        nonce: randomUUID(),
        subject: 'demo',
        version: 'v1'
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encodedPayload}.${signPayload(encodedPayload, config.secret)}`;
}

export function verifyDemoAccessToken(token: string | undefined, config: DemoAccessConfig, nowMs = Date.now()): boolean {
    if (!token) return false;

    const [encodedPayload, signature, extra] = token.split('.');
    if (!encodedPayload || !signature || extra !== undefined) return false;

    const expectedSignature = signPayload(encodedPayload, config.secret);
    if (!secureStringEqual(signature, expectedSignature)) return false;

    const payload = decodePayload(encodedPayload);
    if (!payload) return false;

    return payload.expiresAt > Math.floor(nowMs / 1_000);
}
