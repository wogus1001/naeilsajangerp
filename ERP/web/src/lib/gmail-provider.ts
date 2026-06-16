import {
    GMAIL_OAUTH_SCOPES,
    GMAIL_SEND_SCOPE,
    GmailIntegrationError
} from './gmail-integration';

type GmailConfig = {
    readonly clientId: string;
    readonly clientSecret: string;
};

type GmailTokenResponse = {
    readonly access_token?: string;
    readonly refresh_token?: string;
    readonly expires_in?: number;
    readonly scope?: string;
    readonly error?: string;
    readonly error_description?: string;
};

type GmailUserInfoResponse = {
    readonly email?: string;
};

type GmailSendResponse = {
    readonly id?: string;
    readonly threadId?: string;
};

export type GmailTokenExchangeResult = {
    readonly accessToken: string;
    readonly refreshToken: string | null;
    readonly expiresAt: string | null;
    readonly scope: string;
};

export type GmailSendResult = {
    readonly messageId: string;
    readonly threadId: string;
};

function getGmailConfig(): GmailConfig {
    const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET || '';
    if (!clientId || !clientSecret) {
        throw new GmailIntegrationError('Gmail OAuth 환경변수가 설정되지 않았습니다.', 424);
    }
    return { clientId, clientSecret };
}

function trimTrailingSlashes(value: string): string {
    return value.replace(/\/+$/, '');
}

function isLocalOAuthHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function getAppUrlFromEnv(fallbackOrigin: string) {
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!configuredAppUrl) return trimTrailingSlashes(fallbackOrigin);

    try {
        const fallbackUrl = new URL(fallbackOrigin);
        const configuredUrl = new URL(configuredAppUrl);
        if (isLocalOAuthHost(fallbackUrl.hostname) && isLocalOAuthHost(configuredUrl.hostname)) {
            return trimTrailingSlashes(fallbackUrl.origin);
        }
        return trimTrailingSlashes(configuredUrl.origin);
    } catch {
        return trimTrailingSlashes(fallbackOrigin);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toErrorMessage(payload: unknown, fallback: string) {
    if (!isRecord(payload)) return fallback;
    const description = typeof payload.error_description === 'string' ? payload.error_description : '';
    const error = typeof payload.error === 'string' ? payload.error : '';
    return description || error || fallback;
}

async function fetchJson<T>(url: string, init: RequestInit, fallbackError: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        const payload: unknown = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new GmailIntegrationError(toErrorMessage(payload, fallbackError), response.status);
        }
        return payload as T;
    } catch (error) {
        if (error instanceof GmailIntegrationError) throw error;
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new GmailIntegrationError('Gmail API 요청 시간이 초과되었습니다.', 504);
        }
        throw new GmailIntegrationError(fallbackError, 502);
    } finally {
        clearTimeout(timeout);
    }
}

function toTokenResult(token: GmailTokenResponse): GmailTokenExchangeResult {
    if (!token.access_token) {
        throw new GmailIntegrationError(toErrorMessage(token, 'Gmail access token을 받을 수 없습니다.'), 502);
    }
    const expiresAt = typeof token.expires_in === 'number'
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null;
    return {
        accessToken: token.access_token,
        refreshToken: token.refresh_token || null,
        expiresAt,
        scope: token.scope || GMAIL_SEND_SCOPE
    };
}

export function getGmailRedirectUri(requestUrl: string): string {
    return new URL('/api/integrations/gmail/callback', getAppUrlFromEnv(new URL(requestUrl).origin)).toString();
}

export function getGmailRedirectUriFromRequest(request: Request): string {
    const requestUrl = new URL(request.url);
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || request.headers.get('host') || requestUrl.host;
    const protocol = forwardedProto || requestUrl.protocol.replace(/:$/, '');
    return getGmailRedirectUri(`${protocol}://${host}`);
}

export function buildGmailAuthUrl(input: { readonly redirectUri: string; readonly state: string }): URL {
    const config = getGmailConfig();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', input.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('scope', GMAIL_OAUTH_SCOPES.join(' '));
    url.searchParams.set('state', input.state);
    return url;
}

export async function exchangeGmailCode(code: string, redirectUri: string): Promise<GmailTokenExchangeResult> {
    const config = getGmailConfig();
    const body = new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
    });
    const token = await fetchJson<GmailTokenResponse>('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    }, 'Gmail OAuth 토큰 교환에 실패했습니다.');
    return toTokenResult(token);
}

export async function refreshGmailAccessToken(refreshToken: string): Promise<GmailTokenExchangeResult> {
    const config = getGmailConfig();
    const body = new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token'
    });
    const token = await fetchJson<GmailTokenResponse>('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    }, 'Gmail access token 갱신에 실패했습니다.');
    return toTokenResult({ ...token, refresh_token: refreshToken });
}

export async function fetchGmailUserEmail(accessToken: string): Promise<string> {
    const profile = await fetchJson<GmailUserInfoResponse>('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
    }, 'Gmail 사용자 정보를 확인하지 못했습니다.');
    if (!profile.email) throw new GmailIntegrationError('Gmail 이메일 주소를 확인하지 못했습니다.', 502);
    return profile.email;
}

export async function sendGmailMessage(accessToken: string, rawMessage: string): Promise<GmailSendResult> {
    const result = await fetchJson<GmailSendResponse>('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawMessage })
    }, 'Gmail 발송에 실패했습니다.');
    return {
        messageId: result.id || '',
        threadId: result.threadId || ''
    };
}
