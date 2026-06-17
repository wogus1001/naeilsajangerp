export type NoticeRow = {
    readonly id: string;
    readonly company_id?: string | null;
    readonly title: string;
    readonly content?: string | null;
    readonly type?: string | null;
    readonly author_id?: string | null;
    readonly is_pinned?: boolean | null;
    readonly views?: number | null;
    readonly created_at?: string | null;
};

export type NoticeAuthor = {
    readonly name: string | null;
    readonly role: string | null;
};

export type FormattedNotice = NoticeRow & {
    readonly createdAt: string;
    readonly authorName: string;
    readonly authorRole: string;
    readonly isPinned: boolean;
};

export function parseNoticeLimit(value: string | null): number | null {
    if (!value) return null;

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.min(parsed, 50);
}

export function formatNoticeRows(
    rows: readonly NoticeRow[],
    authors: ReadonlyMap<string, NoticeAuthor> = new Map()
): FormattedNotice[] {
    return rows.map(row => {
        const author = row.author_id ? authors.get(row.author_id) : undefined;

        return {
            ...row,
            createdAt: formatNoticeDate(row.created_at),
            authorName: author?.name || '관리자',
            authorRole: author?.role || 'admin',
            isPinned: row.is_pinned === true
        };
    });
}

function formatNoticeDate(value: string | null | undefined): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString().replace(/-/g, '.');
}
