export function formatLeadPhoneInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.startsWith('02')) {
        if (digits.length <= 2) return digits;
        if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;

        const middleEnd = digits.length <= 9 ? 5 : 6;
        return `${digits.slice(0, 2)}-${digits.slice(2, middleEnd)}-${digits.slice(middleEnd)}`;
    }

    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function parseLeadDesiredRegions(value: string): readonly string[] {
    return Array.from(new Set(
        value
            .split(',')
            .map(region => region.trim())
            .filter(Boolean)
    ));
}

export function normalizeLeadDesiredRegionValue(value: string): string {
    return parseLeadDesiredRegions(value).join(', ');
}
