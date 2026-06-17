export const COMPANY_LOGO_MAX_BYTES = 1024 * 1024;

export const COMPANY_LOGO_ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp'
] as const;

export type CompanyLogoValidationInput = {
    readonly name: string;
    readonly size: number;
    readonly type: string;
};

export type CompanyLogoCompanyIdInput = FormDataEntryValue | string | null;

export type CompanyLogoValidationResult =
    | { readonly ok: true }
    | { readonly ok: false; readonly message: string };

const ALLOWED_MIME_TYPE_SET: ReadonlySet<string> = new Set(COMPANY_LOGO_ALLOWED_MIME_TYPES);
const COMPANY_LOGO_SCHEMA_ERROR_CODES = new Set(['42703', 'PGRST204']);

type CompanyLogoErrorFieldBag = {
    readonly code?: unknown;
    readonly message?: unknown;
    readonly details?: unknown;
    readonly hint?: unknown;
};

function isCompanyLogoErrorFieldBag(value: unknown): value is CompanyLogoErrorFieldBag {
    return typeof value === 'object' && value !== null;
}

function readErrorField(error: unknown, key: 'code' | 'message' | 'details' | 'hint'): string {
    if (!isCompanyLogoErrorFieldBag(error)) return '';
    const value = error[key];
    return typeof value === 'string' ? value : '';
}

function extensionForMimeType(mimeType: string): string {
    switch (mimeType) {
        case 'image/png':
            return 'png';
        case 'image/jpeg':
            return 'jpg';
        case 'image/webp':
            return 'webp';
        default:
            return 'bin';
    }
}

export function validateCompanyLogoFile(file: CompanyLogoValidationInput): CompanyLogoValidationResult {
    if (!ALLOWED_MIME_TYPE_SET.has(file.type)) {
        return { ok: false, message: '로고 파일은 PNG, JPG, WebP만 등록할 수 있습니다.' };
    }
    if (file.size <= 0) {
        return { ok: false, message: '비어 있는 파일은 등록할 수 없습니다.' };
    }
    if (file.size > COMPANY_LOGO_MAX_BYTES) {
        return { ok: false, message: '로고 파일은 1MB 이하로 등록해주세요.' };
    }
    return { ok: true };
}

export function normalizeCompanyLogoCompanyId(value: CompanyLogoCompanyIdInput): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

export function sanitizeCompanyLogoFileName(fileName: string, mimeType: string): string {
    const extension = extensionForMimeType(mimeType);
    const baseName = fileName
        .replace(/\.[^.]+$/, '')
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);

    return `${baseName || 'company-logo'}.${extension}`;
}

export function buildCompanyLogoStoragePath(
    companyId: string,
    fileName: string,
    mimeType: string,
    uniqueId: string
): string {
    const safeCompanyId = companyId.replace(/[^a-zA-Z0-9-]/g, '');
    const safeUniqueId = uniqueId.replace(/[^a-zA-Z0-9-]/g, '');
    const safeFileName = sanitizeCompanyLogoFileName(fileName, mimeType);
    return `company-logos/${safeCompanyId}/${safeUniqueId}-${safeFileName}`;
}

export function buildCompanyLogoStorageFolder(companyId: string): string {
    const safeCompanyId = companyId.replace(/[^a-zA-Z0-9-]/g, '');
    return `company-logos/${safeCompanyId}`;
}

export function isCompanyLogoSchemaMissingError(error: unknown): boolean {
    const code = readErrorField(error, 'code');
    if (COMPANY_LOGO_SCHEMA_ERROR_CODES.has(code)) return true;

    const combined = [
        readErrorField(error, 'message'),
        readErrorField(error, 'details'),
        readErrorField(error, 'hint')
    ].join(' ');

    return /logo_url|logo_path|logo_file_name|logo_file_size|logo_mime_type|logo_updated_at/i.test(combined);
}
