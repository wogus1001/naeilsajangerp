export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).trim().replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function cleanString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

export function roundRatio(value: number): number {
    return Math.round(value * 10) / 10;
}
