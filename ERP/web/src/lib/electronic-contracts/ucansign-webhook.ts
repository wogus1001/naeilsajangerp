import { timingSafeEqual } from 'crypto';

export type UcansignWebhookStatus = 'completed' | 'canceled' | 'rejected' | 'deleted' | 'updated';

export type UcansignWebhookPayloadInfo = {
    readonly contractId: string;
    readonly documentId: string;
    readonly rawStatus: string;
};

const CONTRACT_ID_KEYS = ['customValue', 'custom_value'] as const;
const DOCUMENT_ID_KEYS = ['documentId', 'document_id', 'documentID', 'docId', 'doc_id'] as const;
const STATUS_KEYS = [
    'status',
    'documentStatus',
    'document_status',
    'eventType',
    'event_type',
    'event',
    'webhookEvent',
    'webhook_event',
    'action'
] as const;

const DOCUMENT_OBJECT_ID_PATHS = [
    ['document', 'id'],
    ['result', 'document', 'id'],
    ['data', 'document', 'id'],
    ['payload', 'document', 'id']
] as const;

const DOCUMENT_DIRECT_ID_PATHS = [
    ['id'],
    ['result', 'id'],
    ['data', 'id'],
    ['payload', 'id']
] as const;

function safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return timingSafeEqual(leftBuffer, rightBuffer);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringFromUnknown(value: unknown): string {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
    return '';
}

function directStringValue(record: Record<string, unknown>, keys: readonly string[]): string {
    for (const key of keys) {
        const value = stringFromUnknown(record[key]);
        if (value) return value;
    }
    return '';
}

function deepStringValue(value: unknown, keys: readonly string[]): string {
    if (Array.isArray(value)) {
        for (const item of value) {
            const nestedValue = deepStringValue(item, keys);
            if (nestedValue) return nestedValue;
        }
        return '';
    }
    if (!isRecord(value)) return '';

    const directValue = directStringValue(value, keys);
    if (directValue) return directValue;

    for (const item of Object.values(value)) {
        const nestedValue = deepStringValue(item, keys);
        if (nestedValue) return nestedValue;
    }
    return '';
}

function pathStringValue(record: Record<string, unknown>, path: readonly string[]): string {
    let currentValue: unknown = record;
    for (const key of path) {
        if (!isRecord(currentValue)) return '';
        currentValue = currentValue[key];
    }
    return stringFromUnknown(currentValue);
}

function deepPathStringValue(value: unknown, path: readonly string[]): string {
    if (Array.isArray(value)) {
        for (const item of value) {
            const nestedValue = deepPathStringValue(item, path);
            if (nestedValue) return nestedValue;
        }
        return '';
    }
    if (!isRecord(value)) return '';

    const directValue = pathStringValue(value, path);
    if (directValue) return directValue;

    for (const item of Object.values(value)) {
        const nestedValue = deepPathStringValue(item, path);
        if (nestedValue) return nestedValue;
    }
    return '';
}

function documentIdFromPayload(record: Record<string, unknown>): string {
    const namedDocumentId = deepStringValue(record, DOCUMENT_ID_KEYS);
    if (namedDocumentId) return namedDocumentId;

    for (const path of DOCUMENT_OBJECT_ID_PATHS) {
        const documentId = deepPathStringValue(record, path);
        if (documentId) return documentId;
    }

    for (const path of DOCUMENT_DIRECT_ID_PATHS) {
        const documentId = pathStringValue(record, path);
        if (documentId) return documentId;
    }
    return '';
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
        request.headers.get('x-webhook-secret') || ''
    ].filter(Boolean);
}

export function isAuthorizedUcansignWebhook(request: Request, expectedSecret: string | undefined): boolean {
    if (!expectedSecret) return false;
    return candidateSecrets(request).some(candidate => safeEqual(candidate, expectedSecret));
}

export function normalizeUcansignWebhookStatus(value: string): UcansignWebhookStatus | null {
    const normalized = value.toLowerCase().replace(/[\s_-]/g, '');
    if (value.includes('모든 서명 완료')) return 'completed';
    if (value.includes('서명 완료')) return 'updated';
    if (value.includes('취소')) return 'canceled';
    if (value.includes('거절')) return 'rejected';
    if (value.includes('삭제')) return 'deleted';
    if (normalized.includes('complete')) return 'completed';
    if (normalized.includes('cancel')) return 'canceled';
    if (normalized.includes('reject')) return 'rejected';
    if (normalized.includes('trash') || normalized.includes('delete')) return 'deleted';
    if (normalized.includes('update') || normalized.includes('send') || normalized.includes('sign') || normalized.includes('progress')) return 'updated';
    return null;
}

export function extractUcansignWebhookPayloadInfo(payload: Record<string, unknown>): UcansignWebhookPayloadInfo {
    return {
        contractId: deepStringValue(payload, CONTRACT_ID_KEYS),
        documentId: documentIdFromPayload(payload),
        rawStatus: deepStringValue(payload, STATUS_KEYS)
    };
}
