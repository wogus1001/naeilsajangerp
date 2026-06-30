type WorkIntakePropertyMeta = {
    readonly companyName: string;
    readonly authorName?: string;
    readonly status: string;
};

function joinParts(parts: readonly string[]): string {
    return parts.map(part => part.trim()).filter(Boolean).join(' / ') || '-';
}

export function formatWorkIntakePropertyMeta(item: WorkIntakePropertyMeta): string {
    return joinParts([
        item.companyName,
        item.authorName ? `작성자 ${item.authorName}` : '',
        item.status
    ]);
}
