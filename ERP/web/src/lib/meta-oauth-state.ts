export const META_OAUTH_NONCE_COOKIE = 'meta_oauth_nonce';
export const META_OAUTH_STATE_COOKIE = 'meta_oauth_state';
export const META_OAUTH_REDIRECT_PATH = '/dashboard/franchise-leads';

export type MetaOAuthState = {
    readonly nonce: string;
    readonly requesterId: string;
    readonly companyId: string;
    readonly redirectPath: string;
};

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

export function isSafeMetaOAuthRedirectPath(value: unknown): value is string {
    if (!isNonEmptyString(value) || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
        return false;
    }

    try {
        const base = new URL('https://meta-oauth.local');
        const candidate = new URL(value, base);
        return candidate.origin === base.origin && candidate.pathname === META_OAUTH_REDIRECT_PATH;
    } catch {
        return false;
    }
}

export function getSafeMetaOAuthRedirectPath(value: unknown): string {
    return isSafeMetaOAuthRedirectPath(value) ? value : META_OAUTH_REDIRECT_PATH;
}

function decodeMetaOAuthState(value: string): MetaOAuthState | null {
    try {
        const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

        if (
            !('nonce' in parsed)
            || !('requesterId' in parsed)
            || !('companyId' in parsed)
            || !('redirectPath' in parsed)
            || !isNonEmptyString(parsed.nonce)
            || !isNonEmptyString(parsed.requesterId)
            || !isNonEmptyString(parsed.companyId)
            || !isSafeMetaOAuthRedirectPath(parsed.redirectPath)
        ) {
            return null;
        }

        return {
            nonce: parsed.nonce,
            requesterId: parsed.requesterId,
            companyId: parsed.companyId,
            redirectPath: parsed.redirectPath
        };
    } catch {
        return null;
    }
}

export function encodeMetaOAuthState(value: MetaOAuthState): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function parseMetaOAuthCallbackState(
    queryState: string | null,
    issuedState: string | null,
    nonceCookie: string | null
): MetaOAuthState | null {
    if (!queryState || !issuedState || queryState !== issuedState || !nonceCookie) return null;

    const state = decodeMetaOAuthState(queryState);
    return state?.nonce === nonceCookie ? state : null;
}
