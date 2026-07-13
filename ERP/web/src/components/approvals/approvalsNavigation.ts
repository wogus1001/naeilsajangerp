export type ApprovalNavigationItem = {
    readonly href: string;
    readonly icon: 'home' | 'write' | 'waiting' | 'mine' | 'department' | 'templates' | 'settings';
    readonly label: string;
};

export const APPROVAL_LOCAL_NAVIGATION: readonly ApprovalNavigationItem[] = [
    { href: '/approvals', icon: 'home', label: '홈' },
    { href: '/approvals/write', icon: 'write', label: '새 문서' },
    { href: '/approvals/pending', icon: 'waiting', label: '결재 대기' },
    { href: '/approvals/mine', icon: 'mine', label: '내 문서함' },
    { href: '/approvals/department', icon: 'department', label: '부서 문서함' },
    { href: '/approvals/templates', icon: 'templates', label: '양식 관리' },
    { href: '/approvals/settings', icon: 'settings', label: '조직·결재 설정' }
] as const;

export function approvalDocumentHref(documentId: string): string {
    return `/approvals/documents/${encodeURIComponent(documentId)}`;
}
