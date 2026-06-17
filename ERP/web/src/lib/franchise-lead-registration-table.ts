function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

export function isMissingLeadRegistrationRequestTableError(error: unknown): boolean {
    if (!isRecord(error)) return false;
    const code = readString(error['code']);
    const message = readString(error['message']);
    const details = readString(error['details']);
    const hint = readString(error['hint']);
    return code === '42P01' ||
        code === 'PGRST205' ||
        [message, details, hint].some(text => text.includes('franchise_lead_registration_requests'));
}

