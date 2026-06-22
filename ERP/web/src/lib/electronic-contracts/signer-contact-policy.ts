export type SignerDeliveryMethod = 'email' | 'kakao';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KOREAN_MOBILE_PATTERN = /^01[016789]\d{7,8}$/;

export function inferSignerDeliveryMethod(contact: string): SignerDeliveryMethod {
    const trimmed = contact.trim();
    if (!trimmed) return 'email';
    return trimmed.includes('@') ? 'email' : 'kakao';
}

export function normalizeSignerContact(method: SignerDeliveryMethod, contact: string): string {
    if (method === 'kakao') return contact.replace(/\D/g, '');
    return contact.trim();
}

export function validateSignerContact(method: SignerDeliveryMethod, contact: string): boolean {
    const normalizedContact = normalizeSignerContact(method, contact);
    if (method === 'email') return EMAIL_PATTERN.test(normalizedContact);
    return KOREAN_MOBILE_PATTERN.test(normalizedContact);
}

export function signerContactPolicyMessage(method: SignerDeliveryMethod): string {
    if (method === 'email') return '이메일 형식으로 입력해주세요. 예: signer@example.com';
    return '휴대폰 번호는 01012345678처럼 숫자 10~11자리로 입력해주세요.';
}
