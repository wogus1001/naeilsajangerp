const SEARCH_TERM_DELIMITER_REGEX = /[\s,，]+/;

export function parseSearchTerms(input: string): string[] {
    return input
        .toLowerCase()
        .split(SEARCH_TERM_DELIMITER_REGEX)
        .map(term => term.trim())
        .filter(Boolean);
}

export function normalizeSearchValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.toLowerCase();
    return String(value).toLowerCase();
}
