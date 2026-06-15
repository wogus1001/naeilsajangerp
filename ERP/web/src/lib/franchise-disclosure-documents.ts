import type { RequesterProfile } from '@/lib/api-auth';
import type { FranchiseDisclosureDocument } from '@/lib/franchise-disclosure-deliveries';

export type JsonRecord = Record<string, unknown>;

export type DisclosureDocumentRow = {
    readonly id: string;
    readonly company_id: string;
    readonly created_by: string | null;
    readonly title: string | null;
    readonly brand_name: string | null;
    readonly franchisor_name: string | null;
    readonly version: string | null;
    readonly file_url: string | null;
    readonly file_name: string | null;
    readonly issued_at: string | null;
    readonly memo: string | null;
    readonly status: string | null;
    readonly created_at: string;
    readonly updated_at: string;
    readonly data: unknown;
};

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getFirst(body: JsonRecord, keys: readonly string[]): unknown {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
    }
    return undefined;
}

function hasAny(body: JsonRecord, keys: readonly string[]): boolean {
    return keys.some(key => Object.prototype.hasOwnProperty.call(body, key));
}

export function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function parseNullableDate(value: unknown): string | null {
    const raw = cleanString(value);
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function readJsonRecord(value: unknown): JsonRecord {
    return isRecord(value) ? value : {};
}

function readRequiredString(row: JsonRecord, key: string): string | null {
    const value = row[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNullableString(row: JsonRecord, key: string): string | null {
    const value = row[key];
    return typeof value === 'string' ? value : null;
}

function isDisclosureDocumentRow(value: DisclosureDocumentRow | null): value is DisclosureDocumentRow {
    return value !== null;
}

export function readDisclosureDocumentRow(value: unknown): DisclosureDocumentRow | null {
    if (!isRecord(value)) return null;
    const id = readRequiredString(value, 'id');
    const companyId = readRequiredString(value, 'company_id');
    const createdAt = readRequiredString(value, 'created_at');
    const updatedAt = readRequiredString(value, 'updated_at');
    if (!id || !companyId || !createdAt || !updatedAt) return null;

    return {
        id,
        company_id: companyId,
        created_by: readNullableString(value, 'created_by'),
        title: readNullableString(value, 'title'),
        brand_name: readNullableString(value, 'brand_name'),
        franchisor_name: readNullableString(value, 'franchisor_name'),
        version: readNullableString(value, 'version'),
        file_url: readNullableString(value, 'file_url'),
        file_name: readNullableString(value, 'file_name'),
        issued_at: readNullableString(value, 'issued_at'),
        memo: readNullableString(value, 'memo'),
        status: readNullableString(value, 'status'),
        created_at: createdAt,
        updated_at: updatedAt,
        data: value.data
    };
}

export function readDisclosureDocumentRows(value: unknown): readonly DisclosureDocumentRow[] {
    if (!Array.isArray(value)) return [];
    return value.map(readDisclosureDocumentRow).filter(isDisclosureDocumentRow);
}

export async function readDisclosureDocumentBody(request: Request): Promise<JsonRecord> {
    try {
        const parsed = await request.json();
        return isRecord(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function getErrorCode(error: unknown): string {
    if (!isRecord(error)) return '';
    return typeof error.code === 'string' ? error.code : '';
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (!isRecord(error)) return '';
    return typeof error.message === 'string' ? error.message : '';
}

export function isMissingDisclosureDocumentSchemaError(error: unknown): boolean {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code)
        && /franchise_disclosure_documents/i.test(message);
}

export function transformDisclosureDocument(row: DisclosureDocumentRow): FranchiseDisclosureDocument {
    return {
        ...readJsonRecord(row.data),
        id: row.id,
        companyId: row.company_id,
        createdBy: row.created_by,
        title: row.title || '',
        brandName: row.brand_name || '',
        franchisorName: row.franchisor_name || '',
        version: row.version || 'v1',
        fileUrl: row.file_url || '',
        fileName: row.file_name || '',
        issuedAt: row.issued_at,
        memo: row.memo || '',
        status: row.status === 'archived' ? 'archived' : 'active',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export function requesterFallback(body: JsonRecord): string | null {
    return cleanString(getFirst(body, ['requesterId', 'userId', 'managerId', 'manager_id']));
}

export function buildDisclosureDocumentPayload(
    body: JsonRecord,
    requester: RequesterProfile,
    companyId: string,
    existingData: JsonRecord = {}
) {
    return {
        company_id: companyId,
        created_by: requester.id,
        title: cleanString(getFirst(body, ['title', 'documentTitle', 'document_title'])) || '',
        brand_name: cleanString(getFirst(body, ['brandName', 'brand_name'])) || '',
        franchisor_name: cleanString(getFirst(body, ['franchisorName', 'franchisor_name'])) || '',
        version: cleanString(getFirst(body, ['version', 'documentVersion', 'document_version'])) || 'v1',
        file_url: cleanString(getFirst(body, ['fileUrl', 'file_url'])) || '',
        file_name: cleanString(getFirst(body, ['fileName', 'file_name'])) || '',
        issued_at: parseNullableDate(getFirst(body, ['issuedAt', 'issued_at'])),
        memo: cleanString(getFirst(body, ['memo'])) || '',
        status: cleanString(getFirst(body, ['status'])) === 'archived' ? 'archived' : 'active',
        updated_at: new Date().toISOString(),
        data: existingData
    };
}

export function buildDisclosureDocumentUpdates(body: JsonRecord, existing: DisclosureDocumentRow): JsonRecord {
    const updates: JsonRecord = {
        updated_at: new Date().toISOString(),
        data: readJsonRecord(existing.data)
    };
    if (hasAny(body, ['title', 'documentTitle', 'document_title'])) updates.title = cleanString(getFirst(body, ['title', 'documentTitle', 'document_title'])) || '';
    if (hasAny(body, ['brandName', 'brand_name'])) updates.brand_name = cleanString(getFirst(body, ['brandName', 'brand_name'])) || '';
    if (hasAny(body, ['franchisorName', 'franchisor_name'])) updates.franchisor_name = cleanString(getFirst(body, ['franchisorName', 'franchisor_name'])) || '';
    if (hasAny(body, ['version', 'documentVersion', 'document_version'])) updates.version = cleanString(getFirst(body, ['version', 'documentVersion', 'document_version'])) || 'v1';
    if (hasAny(body, ['fileUrl', 'file_url'])) updates.file_url = cleanString(getFirst(body, ['fileUrl', 'file_url'])) || '';
    if (hasAny(body, ['fileName', 'file_name'])) updates.file_name = cleanString(getFirst(body, ['fileName', 'file_name'])) || '';
    if (hasAny(body, ['issuedAt', 'issued_at'])) updates.issued_at = parseNullableDate(getFirst(body, ['issuedAt', 'issued_at']));
    if (hasAny(body, ['memo'])) updates.memo = cleanString(getFirst(body, ['memo'])) || '';
    if (hasAny(body, ['status'])) updates.status = cleanString(getFirst(body, ['status'])) === 'archived' ? 'archived' : 'active';
    return updates;
}
