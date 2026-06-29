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
    readonly authorId: string | null;
    readonly createdAt: string;
    readonly authorName: string;
    readonly authorRole: string;
    readonly isPinned: boolean;
};

export type NoticeViewer = {
    readonly id?: string;
    readonly uid?: string;
    readonly uuid?: string;
    readonly userId?: string;
    readonly user_id?: string;
    readonly role?: string;
    readonly companyId?: string;
    readonly company_id?: string;
};

export type NoticePermissionSource = {
    readonly authorId?: string | null;
    readonly author_id?: string | null;
    readonly companyId?: string | null;
    readonly company_id?: string | null;
    readonly type?: string | null;
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
            authorId: row.author_id || null,
            createdAt: formatNoticeDate(row.created_at),
            authorName: author?.name || '관리자',
            authorRole: author?.role || 'admin',
            isPinned: row.is_pinned === true
        };
    });
}

export function canManageNotice(viewer: NoticeViewer | null, notice: NoticePermissionSource): boolean {
    if (!viewer) return false;
    if (viewer.role === 'admin' || viewer.role === 'super_admin') return true;

    const noticeAuthorId = notice.authorId || notice.author_id || '';
    const viewerIds = [viewer.uid, viewer.uuid, viewer.userId, viewer.user_id, viewer.id].filter(isNonEmptyString);
    if (noticeAuthorId && viewerIds.includes(noticeAuthorId)) return true;

    const noticeCompanyId = notice.companyId || notice.company_id || '';
    const viewerCompanyId = viewer.companyId || viewer.company_id || '';
    return viewer.role === 'manager'
        && notice.type === 'team'
        && noticeCompanyId.length > 0
        && noticeCompanyId === viewerCompanyId;
}

function formatNoticeDate(value: string | null | undefined): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString().replace(/-/g, '.');
}

function isNonEmptyString(value: string | undefined): value is string {
    return typeof value === 'string' && value.length > 0;
}
