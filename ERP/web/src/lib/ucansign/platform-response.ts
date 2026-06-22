export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function identifierValue(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
}

function urlValue(value: unknown): string {
    return typeof value === 'string' && /^https?:\/\//.test(value) ? value.trim() : '';
}

function firstMatchingValue(value: unknown, keys: readonly string[], parser: (item: unknown) => string): string {
    if (Array.isArray(value)) {
        for (const item of value) {
            const nestedValue = firstMatchingValue(item, keys, parser);
            if (nestedValue) return nestedValue;
        }
        return '';
    }
    if (!isRecord(value)) return '';
    for (const key of keys) {
        const parsedValue = parser(value[key]);
        if (parsedValue) return parsedValue;
    }
    for (const item of Object.values(value)) {
        const nestedValue = firstMatchingValue(item, keys, parser);
        if (nestedValue) return nestedValue;
    }
    return '';
}

function resultRecords(response: unknown): readonly unknown[] {
    if (!isRecord(response)) return [];
    return [response.result, response.data, response.document].filter(item => item !== undefined);
}

export function extractApiKeyAccessToken(response: unknown): string {
    if (!isRecord(response) || !isRecord(response.result)) return '';
    const accessToken = response.result.accessToken;
    return typeof accessToken === 'string' ? accessToken : '';
}

export function extractUcansignTemplateName(response: unknown): string {
    const value = isRecord(response) && isRecord(response.result) ? response.result : response;
    if (!isRecord(value)) return '';
    const candidate = value.name || value.title || value.documentName || value.templateName;
    return typeof candidate === 'string' ? candidate.trim() : '';
}

export function extractUcansignDocumentId(response: unknown): string {
    for (const value of resultRecords(response)) {
        const directId = identifierValue(value);
        if (directId) return directId;
        if (!isRecord(value)) continue;
        const candidate = identifierValue(value.documentId)
            || identifierValue(value.documentID)
            || identifierValue(value.document_id)
            || identifierValue(value.id);
        if (candidate) return candidate;
        const document = value.document;
        if (isRecord(document)) {
            const documentId = identifierValue(document.documentId)
                || identifierValue(document.documentID)
                || identifierValue(document.document_id)
                || identifierValue(document.id);
            if (documentId) return documentId;
        }
    }
    return firstMatchingValue(response, ['documentId', 'documentID', 'document_id'], identifierValue);
}

export function extractUcansignFileUrl(response: unknown): string {
    return firstMatchingValue(response, ['file', 'downloadUrl', 'download_url', 'url'], urlValue);
}

export function errorMessageFromResponse(response: unknown): string {
    if (!isRecord(response)) return 'unknown response';
    const code = response.code;
    const msg = response.msg;
    const codeText = typeof code === 'string' || typeof code === 'number' ? String(code) : '';
    const msgText = typeof msg === 'string' ? msg : '';
    return [codeText, msgText].filter(Boolean).join(': ') || 'unknown response';
}

export function providerResponseFailed(response: unknown): boolean {
    if (!isRecord(response)) return false;
    const code = response.code;
    if (code === undefined || code === null || code === '') return false;
    const normalizedCode = String(code).trim().toLowerCase();
    if (!normalizedCode) return false;
    return normalizedCode !== 'success' && normalizedCode !== 'ok' && !/^0+$/.test(normalizedCode) && normalizedCode !== '200';
}

export function filenameFromDisposition(value: string | null): string {
    if (!value) return '';
    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch (error) {
            if (error instanceof URIError) return utf8Match[1];
            throw error;
        }
    }
    const asciiMatch = /filename="?([^";]+)"?/i.exec(value);
    return asciiMatch?.[1]?.trim() || '';
}
