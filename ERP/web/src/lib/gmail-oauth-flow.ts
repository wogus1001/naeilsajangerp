export const GMAIL_OAUTH_RESULT_MESSAGE_TYPE = 'fcerp:gmail-oauth-result' as const;

export type GmailOAuthCompletionMode = 'redirect' | 'popup';

export type GmailOAuthResultMessage = {
    readonly type: typeof GMAIL_OAUTH_RESULT_MESSAGE_TYPE;
    readonly gmail: 'connected' | 'error';
    readonly email?: string;
    readonly reason?: string;
};

type GmailOAuthResultUrlInput = {
    readonly appUrl: string;
    readonly completionMode: GmailOAuthCompletionMode;
    readonly redirectPath?: string;
    readonly params: Readonly<Record<string, string>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function parseGmailOAuthResultMessage(value: unknown): GmailOAuthResultMessage | null {
    if (!isRecord(value) || value.type !== GMAIL_OAUTH_RESULT_MESSAGE_TYPE) return null;
    if (value.gmail !== 'connected' && value.gmail !== 'error') return null;
    if (value.email !== undefined && typeof value.email !== 'string') return null;
    if (value.reason !== undefined && typeof value.reason !== 'string') return null;
    return {
        type: GMAIL_OAUTH_RESULT_MESSAGE_TYPE,
        gmail: value.gmail,
        ...(value.email ? { email: value.email } : {}),
        ...(value.reason ? { reason: value.reason } : {})
    };
}

export function buildGmailOAuthResultUrl(input: GmailOAuthResultUrlInput): URL {
    const safeRedirectPath = input.redirectPath?.startsWith('/')
        ? input.redirectPath
        : '/dashboard/franchise-leads';
    const path = input.completionMode === 'popup'
        ? '/integrations/gmail/complete'
        : safeRedirectPath;
    const url = new URL(path, input.appUrl);
    Object.entries(input.params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
}
