export const GMAIL_OAUTH_NONCE_COOKIE = 'gmail_oauth_nonce';
export const GMAIL_OAUTH_STATE_COOKIE = 'gmail_oauth_state';

export type GmailOAuthState = {
    readonly nonce: string;
    readonly requesterId: string;
    readonly companyId: string;
    readonly redirectPath: string;
};

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function decodeGmailOAuthState(value: string): GmailOAuthState | null {
    try {
        const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

        const state = parsed as Record<string, unknown>;
        if (
            !isNonEmptyString(state.nonce)
            || !isNonEmptyString(state.requesterId)
            || !isNonEmptyString(state.companyId)
            || !isNonEmptyString(state.redirectPath)
            || !state.redirectPath.startsWith('/')
        ) {
            return null;
        }

        return {
            nonce: state.nonce,
            requesterId: state.requesterId,
            companyId: state.companyId,
            redirectPath: state.redirectPath
        };
    } catch {
        return null;
    }
}

export function encodeGmailOAuthState(value: GmailOAuthState): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function parseGmailOAuthCallbackState(
    queryState: string | null,
    issuedState: string | null,
    nonceCookie: string | null
): GmailOAuthState | null {
    if (!queryState || !issuedState || queryState !== issuedState || !nonceCookie) return null;

    const state = decodeGmailOAuthState(queryState);
    return state?.nonce === nonceCookie ? state : null;
}
