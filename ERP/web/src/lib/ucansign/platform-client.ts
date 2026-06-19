import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const PLATFORM_CONNECTION_ID = 'naeilsajang-platform';
const TOKEN_REFRESH_BUFFER_MS = 120_000;
const TOKEN_EXPIRES_MS = 29 * 60 * 1000;
const UCANSIGN_REQUEST_TIMEOUT_MS = 20_000;

export const UCANSIGN_PLATFORM_BASE_URL = process.env.UCANSIGN_BASE_URL || 'https://app.ucansign.com/openapi';

type PlatformConnectionRow = {
    readonly id: string;
    readonly status: string | null;
    readonly access_token_encrypted: string | null;
    readonly refresh_token_encrypted: string | null;
    readonly expires_at: number | null;
};

type RequestOptions = Omit<RequestInit, 'headers'> & {
    readonly headers?: Record<string, string>;
};

export class UcansignPlatformError extends Error {
    readonly code: 'NOT_CONFIGURED' | 'NOT_CONNECTED' | 'TOKEN_REFRESH_FAILED' | 'API_ERROR';

    constructor(code: UcansignPlatformError['code'], message: string) {
        super(message);
        this.name = 'UcansignPlatformError';
        this.code = code;
    }
}

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new UcansignPlatformError('NOT_CONFIGURED', `${name} is required`);
    return value;
}

function encryptionKey(): Buffer {
    return createHash('sha256').update(requiredEnv('UCANSIGN_TOKEN_ENCRYPTION_KEY')).digest();
}

export function encryptUcansignSecret(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}

export function decryptUcansignSecret(value: string): string {
    const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
    if (!ivRaw || !tagRaw || !encryptedRaw) {
        throw new UcansignPlatformError('NOT_CONNECTED', 'Invalid stored UCanSign token');
    }
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivRaw, 'base64'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(encryptedRaw, 'base64')),
        decipher.final()
    ]).toString('utf8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonWithBigIntIds(text: string): unknown {
    const cleanText = text.replace(/"((?:document|folder|user|participant|attachment)?Id|id)"\s*:\s*(\d{15,})/g, '"$1": "$2"');
    return JSON.parse(cleanText);
}

function getResultToken(response: unknown): { readonly accessToken: string; readonly refreshToken?: string } | null {
    if (!isRecord(response) || !isRecord(response.result)) return null;
    const accessToken = response.result.accessToken;
    const refreshToken = response.result.refreshToken;
    if (typeof accessToken !== 'string' || !accessToken) return null;
    if (typeof refreshToken === 'string' && refreshToken) return { accessToken, refreshToken };
    return { accessToken };
}

async function fetchConnection(): Promise<PlatformConnectionRow> {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('platform_ucansign_connection')
        .select('id, status, access_token_encrypted, refresh_token_encrypted, expires_at')
        .eq('id', PLATFORM_CONNECTION_ID)
        .maybeSingle<PlatformConnectionRow>();

    if (error) throw error;
    if (!data || data.status !== 'active' || !data.access_token_encrypted) {
        throw new UcansignPlatformError('NOT_CONNECTED', 'Naeilsajang UCanSign account is not connected');
    }
    return data;
}

async function saveTokens(tokens: { readonly accessToken: string; readonly refreshToken?: string }, connectedBy?: string): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();
    const payload = {
        id: PLATFORM_CONNECTION_ID,
        status: 'active',
        access_token_encrypted: encryptUcansignSecret(tokens.accessToken),
        refresh_token_encrypted: tokens.refreshToken ? encryptUcansignSecret(tokens.refreshToken) : null,
        expires_at: Date.now() + TOKEN_EXPIRES_MS,
        connected_by: connectedBy || null,
        updated_at: new Date().toISOString()
    };
    const { error } = await supabaseAdmin.from('platform_ucansign_connection').upsert(payload);
    if (error) throw error;
}

export async function savePlatformUcansignTokens(
    tokens: { readonly accessToken: string; readonly refreshToken?: string },
    connectedBy: string
): Promise<void> {
    await saveTokens(tokens, connectedBy);
}

async function refreshToken(connection: PlatformConnectionRow): Promise<string> {
    const accessToken = decryptUcansignSecret(connection.access_token_encrypted || '');
    const refreshToken = connection.refresh_token_encrypted
        ? decryptUcansignSecret(connection.refresh_token_encrypted)
        : '';
    const response = await fetch(`${UCANSIGN_PLATFORM_BASE_URL}/user/oauth/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(UCANSIGN_REQUEST_TIMEOUT_MS),
        body: JSON.stringify({
            grantType: 'refresh',
            clientId: requiredEnv('UCANSIGN_CLIENT_ID'),
            clientSecret: requiredEnv('UCANSIGN_CLIENT_SECRET'),
            accessToken,
            refreshToken: refreshToken || undefined
        })
    });
    const body = parseJsonWithBigIntIds(await response.text());
    const tokens = getResultToken(body);
    if (!response.ok || !tokens) {
        throw new UcansignPlatformError('TOKEN_REFRESH_FAILED', 'Failed to refresh UCanSign platform token');
    }
    await saveTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || refreshToken });
    return tokens.accessToken;
}

async function getPlatformToken(forceRefresh = false): Promise<string> {
    const connection = await fetchConnection();
    const expiresAt = Number(connection.expires_at || 0);
    if (!forceRefresh && Date.now() < expiresAt - TOKEN_REFRESH_BUFFER_MS) {
        return decryptUcansignSecret(connection.access_token_encrypted || '');
    }
    return refreshToken(connection);
}

export async function uCanSignPlatformClient(
    endpoint: string,
    options: RequestOptions = {},
    isRetry = false
): Promise<unknown> {
    const token = await getPlatformToken();
    const defaultHeaders: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Naeilsajang-UCanSign/1.0'
    };
    if (options.method !== 'GET' && options.body && !options.headers?.['Content-Type']) {
        defaultHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${UCANSIGN_PLATFORM_BASE_URL}${endpoint}`, {
        ...options,
        signal: options.signal || AbortSignal.timeout(UCANSIGN_REQUEST_TIMEOUT_MS),
        headers: { ...defaultHeaders, ...options.headers }
    });

    if (response.status === 401 && !isRetry) {
        await getPlatformToken(true);
        return uCanSignPlatformClient(endpoint, options, true);
    }
    if (response.status === 204) return null;

    const text = await response.text();
    const body = text ? parseJsonWithBigIntIds(text) : null;
    if (!response.ok) {
        throw new UcansignPlatformError('API_ERROR', `UCanSign API error: ${response.status}`);
    }
    if (isRecord(body) && body.code === 401 && !isRetry) {
        await getPlatformToken(true);
        return uCanSignPlatformClient(endpoint, options, true);
    }
    return body;
}
