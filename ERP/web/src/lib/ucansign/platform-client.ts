import {
    errorMessageFromResponse,
    extractApiKeyAccessToken,
    extractUcansignFileUrl,
    extractUcansignTemplateName,
    filenameFromDisposition,
    isRecord,
    providerResponseFailed
} from './platform-response';
import {
    normalizePlatformDocumentFile,
    type PlatformDocumentFile
} from './platform-file';

const TOKEN_REFRESH_BUFFER_MS = 120_000;
const TOKEN_EXPIRES_MS = 30 * 60 * 1000;
const UCANSIGN_REQUEST_TIMEOUT_MS = 20_000;

export const UCANSIGN_PLATFORM_BASE_URL = process.env.UCANSIGN_BASE_URL || 'https://app.ucansign.com/openapi';
export {
    extractApiKeyAccessToken,
    extractUcansignDocumentId,
    extractUcansignFileUrl,
    extractUcansignTemplateName
} from './platform-response';
export { normalizePlatformDocumentFile } from './platform-file';
export type { PlatformDocumentFile } from './platform-file';

type RequestOptions = Omit<RequestInit, 'headers'> & {
    readonly headers?: Record<string, string>;
};

type CachedPlatformToken = {
    readonly accessToken: string;
    readonly expiresAt: number;
};

let cachedPlatformToken: CachedPlatformToken | null = null;

export class UcansignPlatformError extends Error {
    readonly code: 'NOT_CONFIGURED' | 'TOKEN_REFRESH_FAILED' | 'API_ERROR';

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

function parseJsonWithBigIntIds(text: string): unknown {
    const cleanText = text.replace(/"((?:document|folder|user|participant|attachment)?Id|id)"\s*:\s*(\d{15,})/g, '"$1": "$2"');
    return JSON.parse(cleanText);
}

function parseUcansignResponse(text: string): unknown {
    if (!text) return null;
    try {
        return parseJsonWithBigIntIds(text);
    } catch {
        return { msg: text.slice(0, 200) };
    }
}

async function issueApiKeyAccessToken(): Promise<string> {
    const response = await fetch(`${UCANSIGN_PLATFORM_BASE_URL}/user/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(UCANSIGN_REQUEST_TIMEOUT_MS),
        body: JSON.stringify({ apiKey: requiredEnv('UCANSIGN_API_KEY') })
    });
    const text = await response.text();
    const body = parseUcansignResponse(text);
    const accessToken = extractApiKeyAccessToken(body);
    if (!response.ok || !accessToken) {
        throw new UcansignPlatformError(
            'TOKEN_REFRESH_FAILED',
            `내일사장 공용 유캔싸인 API KEY 토큰 발급에 실패했습니다. (${errorMessageFromResponse(body)})`
        );
    }
    cachedPlatformToken = {
        accessToken,
        expiresAt: Date.now() + TOKEN_EXPIRES_MS
    };
    return accessToken;
}

async function getPlatformToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && cachedPlatformToken && Date.now() < cachedPlatformToken.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
        return cachedPlatformToken.accessToken;
    }
    return issueApiKeyAccessToken();
}

export async function uCanSignPlatformClient(
    endpoint: string,
    options: RequestOptions = {},
    isRetry = false
): Promise<unknown> {
    const token = await getPlatformToken(isRetry);
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
        return uCanSignPlatformClient(endpoint, options, true);
    }
    if (response.status === 204) return null;

    const text = await response.text();
    const body = parseUcansignResponse(text);
    if (!response.ok) {
        throw new UcansignPlatformError('API_ERROR', `UCanSign API error: ${response.status}`);
    }
    if (isRecord(body) && String(body.code).trim() === '401' && !isRetry) {
        return uCanSignPlatformClient(endpoint, options, true);
    }
    if (providerResponseFailed(body)) {
        throw new UcansignPlatformError('API_ERROR', `UCanSign API error: ${errorMessageFromResponse(body)}`);
    }
    return body;
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
    if (!url) throw new UcansignPlatformError('API_ERROR', 'UCanSign embedding URL is missing');
    return url;
}

export async function createPlatformTemplateEmbedding(redirectUrl: string): Promise<string> {
    const response = await uCanSignPlatformClient('/embedding/template-creating', {
        method: 'POST',
        body: JSON.stringify({ redirectUrl })
    });
    return embeddingUrlFromResponse(response);
}

export async function modifyPlatformTemplateEmbedding(documentId: string, redirectUrl: string): Promise<string> {
    const response = await uCanSignPlatformClient(`/embedding/template-modifying/${encodeURIComponent(documentId)}`, {
        method: 'POST',
        body: JSON.stringify({ redirectUrl })
    });
    return embeddingUrlFromResponse(response);
}

export async function getPlatformTemplateName(documentId: string): Promise<string> {
    const response = await uCanSignPlatformClient(`/templates/${encodeURIComponent(documentId)}`, {
        method: 'GET'
    });
    return extractUcansignTemplateName(response);
}

export async function getPlatformTemplateDetail(documentId: string): Promise<unknown> {
    return uCanSignPlatformClient(`/templates/${encodeURIComponent(documentId)}`, {
        method: 'GET'
    });
}

export async function getPlatformDocumentFullFileUrl(documentId: string): Promise<string> {
    const response = await uCanSignPlatformClient(`/documents/${encodeURIComponent(documentId)}/full-file`, {
        method: 'GET'
    });
    const url = extractUcansignFileUrl(response);
    if (!url) throw new UcansignPlatformError('API_ERROR', 'UCanSign document file URL is missing');
    return url;
}

export async function downloadPlatformDocumentFullFile(
    documentId: string,
    fileNameHint = ''
): Promise<PlatformDocumentFile> {
    const url = await getPlatformDocumentFullFileUrl(documentId);
    const response = await fetch(url, {
        signal: AbortSignal.timeout(UCANSIGN_REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) {
        throw new UcansignPlatformError('API_ERROR', `UCanSign document download failed: ${response.status}`);
    }
    return normalizePlatformDocumentFile({
        content: await response.arrayBuffer(),
        contentType: response.headers.get('content-type') || 'application/pdf',
        fileName: filenameFromDisposition(response.headers.get('content-disposition'))
    }, fileNameHint);
}
