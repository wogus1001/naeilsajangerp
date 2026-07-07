export type FranchiseFileAttachment = {
    readonly name: string;
    readonly size: number;
    readonly type: string;
    readonly storageBucket?: string;
    readonly storagePath?: string;
    readonly publicUrl?: string;
};

export const FRANCHISE_ATTACHMENT_POLICY = {
    maxFiles: 10,
    maxFileSizeBytes: 10 * 1024 * 1024,
    maxTotalSizeBytes: 50 * 1024 * 1024,
    acceptedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
    accept: '.pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf'
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

function readFileSize(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
    const parsed = Number(cleanString(value).replace(/,/g, ''));
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function trimNumber(value: number): string {
    if (!Number.isFinite(value)) return '';
    return value.toFixed(2).replace(/\.?0+$/, '');
}

export function getFranchiseAttachmentKey(file: FranchiseFileAttachment): string {
    return `${file.name}:${file.size}`;
}

export function getFranchiseAttachmentExtension(fileName: string): string {
    const index = fileName.lastIndexOf('.');
    return index >= 0 ? fileName.slice(index).toLowerCase() : '';
}

export function isAcceptedFranchiseAttachment(fileName: string): boolean {
    const extension = getFranchiseAttachmentExtension(fileName);
    return FRANCHISE_ATTACHMENT_POLICY.acceptedExtensions.some(acceptedExtension => acceptedExtension === extension);
}

export function formatFranchiseFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${trimNumber(bytes / 1024 / 1024)}MB`;
    if (bytes >= 1024) return `${trimNumber(bytes / 1024)}KB`;
    return `${Math.max(0, Math.round(bytes))}B`;
}

export function normalizeFranchiseFileAttachments(value: unknown): readonly FranchiseFileAttachment[] {
    if (!Array.isArray(value)) return [];

    return value.reduce<FranchiseFileAttachment[]>((attachments, item) => {
        if (!isRecord(item)) return attachments;
        const name = cleanString(item.name);
        if (!name) return attachments;
        const attachment: FranchiseFileAttachment = {
            name,
            size: readFileSize(item.size),
            type: cleanString(item.type) || getFranchiseAttachmentExtension(name)
        };
        const storageBucket = cleanString(item.storageBucket);
        const storagePath = cleanString(item.storagePath);
        const publicUrl = cleanString(item.publicUrl);
        attachments.push({
            ...attachment,
            ...(storageBucket ? { storageBucket } : {}),
            ...(storagePath ? { storagePath } : {}),
            ...(publicUrl ? { publicUrl } : {})
        });
        return attachments;
    }, []);
}

export function normalizeFranchiseFileNames(
    value: unknown,
    attachments: readonly FranchiseFileAttachment[]
): readonly string[] {
    if (Array.isArray(value)) {
        const names = value.map(cleanString).filter(Boolean);
        if (names.length > 0) return names;
    }

    return attachments.map(file => file.name);
}
