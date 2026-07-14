import type { ApprovalInboxSearchCriteria, InboxStatus } from './boundary';

type SearchableApprovalDocument = {
    readonly id: string;
    readonly title: string;
    readonly documentNumber: string;
    readonly authorName: string;
    readonly departmentName: string;
    readonly templateName: string;
    readonly status: string;
    readonly submittedAt: string | null;
    readonly dueAt?: string | null;
    readonly updatedAt: string;
};

function normalizedSearchText(value: string): string {
    return value.trim().toLocaleLowerCase('ko-KR');
}

function kstDateKey(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() + 9 * 60 * 60 * 1_000).toISOString().slice(0, 10);
}

function matchesStatus(documentStatus: string, status: InboxStatus): boolean {
    return status === 'all' || documentStatus === status;
}

export function filterApprovalInboxDocuments<Document extends SearchableApprovalDocument>(
    documents: readonly Document[],
    criteria: ApprovalInboxSearchCriteria
): readonly Document[] {
    const query = normalizedSearchText(criteria.query);
    return documents.filter(document => {
        if (!matchesStatus(document.status, criteria.status)) return false;
        if (query) {
            const searchable = normalizedSearchText([
                document.title,
                document.documentNumber,
                document.authorName,
                document.departmentName,
                document.templateName
            ].join(' '));
            if (!searchable.includes(query)) return false;
        }
        const date = kstDateKey(document.submittedAt || document.updatedAt);
        if (criteria.from && date < criteria.from) return false;
        if (criteria.to && date > criteria.to) return false;
        return true;
    });
}
