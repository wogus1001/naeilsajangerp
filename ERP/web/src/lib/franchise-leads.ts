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
    'Meta Lead Ads',
    '전화문의',
    '고객DB',
    '명함DB',
    '기타'
] as const;

export const FRANCHISE_LEAD_GRADES = [
    'HOT',
    'WARM',
    'COLD'
] as const;

export type FranchiseLeadGrade = typeof FRANCHISE_LEAD_GRADES[number];

export const FRANCHISE_LEAD_GRADE_LABELS: Record<FranchiseLeadGrade, string> = {
    HOT: '즉시상담',
    WARM: '관심확인',
    COLD: '장기관리'
} as const;

export const FRANCHISE_LEAD_STAGES = ['raw_intake', 'candidate'] as const;

export type FranchiseLeadStage = typeof FRANCHISE_LEAD_STAGES[number];

export const FRANCHISE_LEAD_STAGE_LABELS: Record<FranchiseLeadStage, string> = {
    raw_intake: '1차 유입 DB',
    candidate: '후보자'
} as const;

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
    if (raw.includes('HOT') || raw.includes('즉시') || raw.includes('긴급') || raw.includes('우선') || raw.includes('상')) return 'HOT';
    if (raw.includes('WARM') || raw.includes('관심') || raw.includes('확인') || raw.includes('중')) return 'WARM';
    if (raw.includes('COLD') || raw.includes('장기') || raw.includes('낮') || raw.includes('하')) return 'COLD';
    return raw;
}

export function getFranchiseLeadGradeLabel(value?: string | null): string {
    if (value === 'HOT') return FRANCHISE_LEAD_GRADE_LABELS.HOT;
    if (value === 'WARM') return FRANCHISE_LEAD_GRADE_LABELS.WARM;
    if (value === 'COLD') return FRANCHISE_LEAD_GRADE_LABELS.COLD;
    return value || '미지정';
}

export function normalizeLeadStage(value: unknown): FranchiseLeadStage {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'raw_intake' || raw.includes('1차') || raw.includes('유입') || raw.includes('raw')) return 'raw_intake';
    return 'candidate';
}

export function getFranchiseLeadStageLabel(value?: string | null): string {
    return normalizeLeadStage(value) === 'raw_intake'
        ? FRANCHISE_LEAD_STAGE_LABELS.raw_intake
        : FRANCHISE_LEAD_STAGE_LABELS.candidate;
}
