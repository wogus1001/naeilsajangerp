type WorkIntakePropertyMeta = {
    readonly companyName?: unknown;
    readonly authorName?: unknown;
    readonly status?: unknown;
};

function cleanText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

function joinParts(parts: readonly unknown[]): string {
    return parts.map(cleanText).filter(Boolean).join(' / ') || '-';
}

export function formatWorkIntakePropertyMeta(item: WorkIntakePropertyMeta): string {
    const authorName = cleanText(item.authorName);
    return joinParts([
        item.companyName,
        authorName ? `작성자 ${authorName}` : '',
        item.status
    ]);
}
