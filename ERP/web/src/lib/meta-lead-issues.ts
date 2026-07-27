const META_ISSUE_CODES = new Set([
    'META_CONNECTION_REAUTH_REQUIRED',
    'META_PAGE_SUBSCRIPTION_FAILED',
    'META_FORM_SYNC_FAILED',
    'META_DEFAULT_MANAGER_REQUIRED',
    'META_LEAD_FIELDS_REQUIRED',
    'META_LEAD_IMPORT_FAILED'
]);

function readExistingMetaIssueCode(value: unknown): string | null {
    return typeof value === 'string' && META_ISSUE_CODES.has(value) ? value : null;
}

export function sanitizeMetaConnectionIssue(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    const existingCode = readExistingMetaIssueCode(value);
    if (existingCode) return existingCode;
    if (/subscrib|webhook/i.test(value)) return 'META_PAGE_SUBSCRIPTION_FAILED';
    if (/form|lead|sync|fetch/i.test(value)) return 'META_FORM_SYNC_FAILED';
    return 'META_CONNECTION_REAUTH_REQUIRED';
}

export function sanitizeMetaFormIssue(value: unknown): string | null {
    return value ? 'META_FORM_SYNC_FAILED' : null;
}

export function sanitizeMetaSubscriptionIssue(value: unknown): string {
    return value ? 'META_PAGE_SUBSCRIPTION_FAILED' : '';
}

export function sanitizeMetaImportIssue(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    const existingCode = readExistingMetaIssueCode(value);
    if (existingCode) return existingCode;
    if (/default manager/i.test(value)) return 'META_DEFAULT_MANAGER_REQUIRED';
    if (/name and mobile|name.*missing|mobile.*missing/i.test(value)) return 'META_LEAD_FIELDS_REQUIRED';
    return 'META_LEAD_IMPORT_FAILED';
}
