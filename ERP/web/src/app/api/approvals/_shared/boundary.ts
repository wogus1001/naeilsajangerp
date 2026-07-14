export type JsonRecord = Record<string, unknown>;

export const APPROVAL_ACTIONS = [
    'saveDraft',
    'submit',
    'approve',
    'reject',
    'agree',
    'disagree',
    'withdraw',
    'acknowledge',
    'complete'
] as const;

export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number];
export type InboxFilter = 'waiting' | 'drafted' | 'rejected' | 'reference' | 'received' | 'mine' | 'department';

export type InboxQuery = {
    readonly filter: InboxFilter;
    readonly page: number;
    readonly pageSize: number;
};

export type PageQuery = {
    readonly page: number;
    readonly pageSize: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INBOX_FILTERS = ['waiting', 'drafted', 'rejected', 'reference', 'received', 'mine', 'department'] as const;

export class ApprovalInputError extends Error {
    readonly field: string;

    constructor(field: string, message: string) {
        super(message);
        this.name = 'ApprovalInputError';
        this.field = field;
    }
}

export function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasOwn(value: JsonRecord, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(value, key);
}

export async function readJsonRecord(request: Request): Promise<JsonRecord> {
    try {
        const value: unknown = await request.json();
        if (!isRecord(value)) throw new ApprovalInputError('body', 'Request body must be an object');
        return value;
    } catch (error) {
        if (error instanceof ApprovalInputError) throw error;
        if (error instanceof SyntaxError) throw new ApprovalInputError('body', 'Request body must be valid JSON');
        throw error;
    }
}

export function parseRequiredText(value: unknown, field: string, maxLength: number): string {
    const parsed = parseOptionalText(value, field, maxLength);
    if (!parsed) throw new ApprovalInputError(field, `${field} is required`);
    return parsed;
}

export function parseOptionalText(value: unknown, field: string, maxLength: number): string {
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string') throw new ApprovalInputError(field, `${field} must be text`);
    const parsed = value.trim();
    if (parsed.length > maxLength) {
        throw new ApprovalInputError(field, `${field} must be ${maxLength} characters or fewer`);
    }
    return parsed;
}

export function parseOptionalUuid(value: unknown, field: string): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') throw new ApprovalInputError(field, `${field} must be a UUID`);
    const parsed = value.trim().toLowerCase();
    if (!UUID_PATTERN.test(parsed)) throw new ApprovalInputError(field, `${field} must be a valid UUID`);
    return parsed;
}

export function parseRequiredUuid(value: unknown, field: string): string {
    const parsed = parseOptionalUuid(value, field);
    if (!parsed) throw new ApprovalInputError(field, `${field} is required`);
    return parsed;
}

export function parseUuidArray(value: unknown, field: string, maxItems = 100): readonly string[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) throw new ApprovalInputError(field, `${field} must be an array`);
    if (value.length > maxItems) throw new ApprovalInputError(field, `${field} accepts at most ${maxItems} items`);
    return [...new Set(value.map(item => parseRequiredUuid(item, field)))];
}

export function parseRecord(value: unknown, field: string): JsonRecord {
    if (!isRecord(value)) throw new ApprovalInputError(field, `${field} must be an object`);
    return value;
}

export function parseRecordArray(value: unknown, field: string, maxItems = 100): readonly JsonRecord[] {
    if (!Array.isArray(value)) throw new ApprovalInputError(field, `${field} must be an array`);
    if (value.length > maxItems) throw new ApprovalInputError(field, `${field} accepts at most ${maxItems} items`);
    return value.map(item => parseRecord(item, field));
}

export function parseBoolean(value: unknown, field: string): boolean {
    if (typeof value !== 'boolean') throw new ApprovalInputError(field, `${field} must be a boolean`);
    return value;
}

export function parseIntegerValue(value: unknown, field: string, minimum: number, maximum: number): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
        throw new ApprovalInputError(field, `${field} must be an integer between ${minimum} and ${maximum}`);
    }
    return value;
}

export function parseAction(value: unknown): ApprovalAction {
    const action = parseRequiredText(value, 'action', 32);
    const parsed = APPROVAL_ACTIONS.find(candidate => candidate === action);
    if (!parsed) throw new ApprovalInputError('action', 'action is not supported');
    return parsed;
}

function parseInteger(value: string | null, field: string, fallback: number, maximum: number): number {
    if (value === null || value === '') return fallback;
    if (!/^\d+$/.test(value)) throw new ApprovalInputError(field, `${field} must be an integer`);
    const parsed = Number(value);
    if (parsed < 1 || parsed > maximum) {
        throw new ApprovalInputError(field, `${field} must be between 1 and ${maximum}`);
    }
    return parsed;
}

export function parseInboxQuery(searchParams: URLSearchParams): InboxQuery {
    const rawFilter = searchParams.get('filter') || 'waiting';
    const filter = INBOX_FILTERS.find(candidate => candidate === rawFilter);
    if (!filter) throw new ApprovalInputError('filter', 'filter is not supported');
    return {
        filter,
        page: parseInteger(searchParams.get('page'), 'page', 1, 1_000_000),
        pageSize: parseInteger(searchParams.get('pageSize'), 'pageSize', 20, 100)
    };
}

export function parsePageQuery(searchParams: URLSearchParams): PageQuery {
    return {
        page: parseInteger(searchParams.get('page'), 'page', 1, 1_000_000),
        pageSize: parseInteger(searchParams.get('pageSize'), 'pageSize', 20, 100)
    };
}
