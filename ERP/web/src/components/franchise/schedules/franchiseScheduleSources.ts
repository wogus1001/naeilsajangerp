export type FranchiseScheduleSource =
    | 'manual'
    | 'approval-document'
    | 'supervision-visit'
    | 'supervision-report'
    | 'supervision-corrective-action'
    | 'opening-project'
    | 'owner-facility-request'
    | 'owner-checklist-completion'
    | 'vendor-contract-renewal'
    | 'disclosure-contract-eligible';

const FRANCHISE_SCHEDULE_SOURCES = [
    'manual',
    'approval-document',
    'supervision-visit',
    'supervision-report',
    'supervision-corrective-action',
    'opening-project',
    'owner-facility-request',
    'owner-checklist-completion',
    'vendor-contract-renewal',
    'disclosure-contract-eligible'
] as const satisfies readonly FranchiseScheduleSource[];

export function getFranchiseScheduleSourceLabel(source: FranchiseScheduleSource): string {
    switch (source) {
        case 'manual':
            return '수동 등록';
        case 'approval-document':
            return '전자결재';
        case 'supervision-visit':
            return 'SV 방문';
        case 'supervision-report':
            return '보고서';
        case 'supervision-corrective-action':
            return '시정조치';
        case 'opening-project':
            return '오픈 준비';
        case 'owner-facility-request':
            return '점주 시설 문의';
        case 'owner-checklist-completion':
            return '점주 체크리스트';
        case 'vendor-contract-renewal':
            return '업체 계약';
        case 'disclosure-contract-eligible':
            return '정보공개서';
    }
}

export function normalizeFranchiseScheduleSource(value: string): FranchiseScheduleSource {
    for (const source of FRANCHISE_SCHEDULE_SOURCES) {
        if (value === source) return source;
    }
    return 'manual';
}
