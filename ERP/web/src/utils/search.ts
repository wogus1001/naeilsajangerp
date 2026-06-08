const SEARCH_TERM_DELIMITER_REGEX = /[\s,，]+/;
const POSTGREST_OR_RESERVED_REGEX = /[,%()]/g;

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

export function matchesSearchTerms(values: unknown[], terms: string[]): boolean {
    if (terms.length === 0) return true;
    const normalizedValues = values.map(normalizeSearchValue);
    return terms.some(term => normalizedValues.some(value => value.includes(term)));
}

export function sanitizePostgrestSearchTerm(term: string): string {
    return term.replace(POSTGREST_OR_RESERVED_REGEX, '').trim();
}

export function buildPostgrestIlikeOrFilter(terms: string[], columns: string[]): string | null {
    const conditions = terms.flatMap(term => {
        const safeTerm = sanitizePostgrestSearchTerm(term);
        if (!safeTerm) return [];
        return columns.map(column => `${column}.ilike.%${safeTerm}%`);
    });

    return conditions.length > 0 ? conditions.join(',') : null;
}
