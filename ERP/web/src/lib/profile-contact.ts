export function normalizeProfileEmail(value: string): string {
    return value.trim().toLowerCase();
}

export function isValidProfileEmail(value: string): boolean {
    const email = normalizeProfileEmail(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeProfilePhone(value: string): string {
    return value.replace(/\D/g, '');
}

export function isValidProfilePhone(value: string): boolean {
    const digits = normalizeProfilePhone(value);
    return digits.length >= 10 && digits.length <= 11;
}

export function formatProfilePhoneInput(value: string): string {
    const digits = normalizeProfilePhone(value).slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
