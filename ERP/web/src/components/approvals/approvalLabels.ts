export const APPROVAL_TEMPLATE_CATEGORIES = [
    { value: 'general', label: '일반 업무', description: '일반 품의와 업무 요청' },
    { value: 'proposal', label: '품의·승인', description: '업무 추진 전 승인 요청' },
    { value: 'report', label: '업무 보고', description: '진행 현황과 결과 보고' },
    { value: 'expense', label: '지출·비용', description: '집행 비용과 증빙 결의' },
    { value: 'finance', label: '지출·재무', description: '지출과 비용 관련 문서' },
    { value: 'hr', label: '인사', description: '인사와 근무 관련 문서' },
    { value: 'operations', label: '운영', description: '가맹점과 본사 운영 문서' },
    { value: 'contract', label: '계약', description: '계약 검토와 승인 보고' }
] as const;

export const APPROVAL_ROLE_OPTIONS = [
    {
        value: 'approval_admin',
        label: '전자결재 관리자',
        description: '양식과 조직, 결재 설정을 관리합니다.',
        companyWide: true
    },
    {
        value: 'final_approver',
        label: '최종 결재 담당자',
        description: '회사 또는 조직의 최종 승인 단계를 담당합니다.',
        companyWide: false
    },
    {
        value: 'finance_reviewer',
        label: '재무 합의 담당자',
        description: '비용과 지출 문서의 합의 단계를 담당합니다.',
        companyWide: false
    }
] as const;

const APPROVAL_RETENTION_LABELS: Readonly<Record<string, string>> = {
    '1y': '1년',
    '3y': '3년',
    '5y': '5년',
    '10y': '10년',
    permanent: '영구'
};

const APPROVAL_SECURITY_LABELS: Readonly<Record<string, string>> = {
    normal: '일반',
    company: '일반',
    restricted: '부서 한정',
    confidential: '대외비'
};

const APPROVAL_DOCUMENT_BOX_LABELS: Readonly<Record<string, string>> = {
    general: '일반 품의',
    finance: '재무·지출',
    hr: '인사',
    operations: '운영'
};

export function approvalCategoryLabel(value: string): string {
    return APPROVAL_TEMPLATE_CATEGORIES.find(category => category.value === value)?.label ?? '기타';
}

export function approvalRoleLabel(roleKey: string, fallback = ''): string {
    const knownLabel = APPROVAL_ROLE_OPTIONS.find(role => role.value === roleKey)?.label;
    const readableFallback = fallback && !/^[a-z0-9_-]+$/i.test(fallback) ? fallback : '';
    return knownLabel || readableFallback || '결재 담당자';
}

export function approvalRetentionLabel(value: string): string {
    return APPROVAL_RETENTION_LABELS[value] ?? '별도 지정';
}

export function approvalSecurityLabel(value: string): string {
    return APPROVAL_SECURITY_LABELS[value] ?? '일반';
}

export function approvalDocumentBoxLabel(value: string): string {
    return APPROVAL_DOCUMENT_BOX_LABELS[value] ?? '일반 품의';
}
