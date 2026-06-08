export const FRANCHISE_LEAD_STATUSES = [
    '문의접수',
    '상담중',
    '가맹검토',
    '입지검토',
    '계약예정',
    '계약완료',
    '보류/이탈'
] as const;

export type FranchiseLeadStatus = typeof FRANCHISE_LEAD_STATUSES[number];

export const DEFAULT_FRANCHISE_LEAD_STATUS: FranchiseLeadStatus = '문의접수';

export const FRANCHISE_LEAD_SOURCES = [
    '네이버폼',
    '랜딩페이지',
    '박람회',
    '소개',
    '광고',
    '전화문의',
    '기타'
] as const;

export const FRANCHISE_LEAD_GRADES = [
    'HOT',
    'WARM',
    'COLD'
] as const;

export function normalizeLeadPhone(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\D/g, '');
}

export function normalizeLeadStatus(value: unknown): FranchiseLeadStatus {
    const raw = String(value || '').trim();
    const directMatch = FRANCHISE_LEAD_STATUSES.find(status => status === raw);
    if (directMatch) return directMatch;

    if (raw.includes('상담')) return '상담중';
    if (raw.includes('가맹')) return '가맹검토';
    if (raw.includes('입지')) return '입지검토';
    if (raw.includes('예정')) return '계약예정';
    if (raw.includes('완료') || raw.includes('계약')) return '계약완료';
    if (raw.includes('보류') || raw.includes('이탈') || raw.includes('취소')) return '보류/이탈';
    return DEFAULT_FRANCHISE_LEAD_STATUS;
}

export function normalizeLeadGrade(value: unknown): string {
    const raw = String(value || '').trim().toUpperCase();
    if (!raw) return '';
    if (raw.includes('HOT') || raw.includes('상')) return 'HOT';
    if (raw.includes('WARM') || raw.includes('중')) return 'WARM';
    if (raw.includes('COLD') || raw.includes('하')) return 'COLD';
    return raw;
}
