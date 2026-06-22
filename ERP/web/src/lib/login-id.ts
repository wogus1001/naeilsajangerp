export const LOGIN_ID_RULE_MESSAGE = '아이디는 3~30자의 영문 소문자, 숫자, 점(.), 밑줄(_), 하이픈(-)만 사용할 수 있습니다.';

const LOGIN_ID_PATTERN = /^[a-z0-9._-]{3,30}$/;

export function normalizeLoginId(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
}

export function isValidLoginId(value: unknown): boolean {
    return LOGIN_ID_PATTERN.test(normalizeLoginId(value));
}

export function getEmailLocalLoginId(email: unknown): string {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const atIndex = normalizedEmail.indexOf('@');
    return atIndex > 0 ? normalizedEmail.slice(0, atIndex) : normalizedEmail;
}

export function isLoginIdSchemaMissing(error: unknown): boolean {
    const errorLike = error as { code?: unknown; message?: unknown; details?: unknown };
    const code = String(errorLike?.code ?? '');
    const message = `${String(errorLike?.message ?? '')} ${String(errorLike?.details ?? '')}`.toLowerCase();

    return code === '42703'
        || code === 'PGRST204'
        || (message.includes('login_id') && (message.includes('column') || message.includes('schema')));
}
