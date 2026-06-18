import {
    DEFAULT_FRANCHISE_LEAD_STATUS,
    FRANCHISE_MATCHING_REQUEST_SOURCE_LABEL,
    normalizeLeadPhone
} from './franchise-leads';

export type FranchiseMatchingRequestPromotionRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly name: string | null;
    readonly mobile: string | null;
    readonly mobile_normalized: string | null;
    readonly source: string | null;
    readonly status: string | null;
    readonly grade: string | null;
    readonly desired_region: string | null;
    readonly interested_brand: string | null;
    readonly budget_min: number | null;
    readonly budget_max: number | null;
    readonly memo: string | null;
    readonly next_contact_at?: string | null;
    readonly created_at?: string | null;
    readonly updated_at?: string | null;
    readonly data: Record<string, unknown> | null;
};

export type FranchiseMatchingRequestPromotionDraft = {
    readonly company_id: string;
    readonly manager_id: string | null;
    readonly name: string;
    readonly mobile: string | null;
    readonly mobile_normalized: string | null;
    readonly source: string;
    readonly status: string;
    readonly grade: string | null;
    readonly desired_region: string;
    readonly budget_min: number | null;
    readonly budget_max: number | null;
    readonly interested_brand: string;
    readonly memo: string;
    readonly next_contact_at: string | null;
    readonly data: Record<string, unknown>;
};

const MEMO_LABELS: Record<string, string> = {
    email: '이메일',
    residence: '거주 지역',
    currentJob: '현재 직업',
    startupExperience: '창업 경험',
    decisionMaker: '의사결정자',
    startupTiming: '창업 가능 시기',
    desiredCategory: '희망 업종',
    brandPreference: '브랜드 선호도',
    ownCapital: '자기자본',
    loanPreference: '대출 희망 여부',
    desiredDeposit: '희망 보증금',
    desiredRent: '희망 월세',
    desiredPremium: '희망 권리금',
    desiredSize: '희망 평수',
    desiredFloor: '희망 층수',
    excludedRegion: '제외 지역',
    ownedPropertyStatus: '보유 물건',
    ownedPropertyName: '보유 물건명',
    ownedPropertyAddress: '보유 물건 주소',
    ownedPropertyAddressDetail: '보유 물건 상세주소',
    ownedArea: '보유 물건 전용면적',
    ownedFloor: '보유 물건 층수',
    ownedDeposit: '보유 물건 보증금',
    ownedRent: '보유 물건 월세',
    ownedMaintenance: '보유 물건 관리비',
    ownedPremium: '보유 물건 권리금',
    ownedCurrentStatus: '보유 물건 현재 상태',
    ownerAgreement: '임대인 협의',
    ownedDescription: '보유 물건 설명',
    matchPriority: '매칭 우선순위',
    proposalRange: '제안 가능 범위',
    urgency: '긴급도',
    extraRequest: '추가 요청사항',
    summaryNote: '상담 요약',
    riskMemo: '리스크 메모',
    recommendedBrands: '추천 브랜드 후보',
    recommendedProperties: '추천 물건 후보',
    nextAction: '다음 액션'
} as const;

function cleanString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function readDataString(data: Record<string, unknown>, key: string): string {
    return cleanString(data[key]);
}

function parseManwonToWon(value: unknown): number | null {
    const compact = cleanString(value).replace(/,/g, '');
    if (!compact) return null;
    const parsed = Number(compact);
    return Number.isFinite(parsed) ? parsed * 10_000 : null;
}

function gradeFromUrgency(value: string): string | null {
    if (value.includes('즉시') || value.includes('높')) return 'HOT';
    if (value.includes('보통')) return 'WARM';
    if (value.includes('낮')) return 'COLD';
    return null;
}

function formatMemoValue(value: unknown): string {
    if (Array.isArray(value)) return value.length > 0 ? `${value.length}건` : '';
    if (value !== null && typeof value === 'object') return JSON.stringify(value);
    return cleanString(value);
}

function buildMemo(source: FranchiseMatchingRequestPromotionRow): string {
    const data = source.data || {};
    const lines = Object.entries(MEMO_LABELS).flatMap(([key, label]) => {
        const formatted = formatMemoValue(data[key]);
        return formatted ? [`- ${label}: ${formatted}`] : [];
    });
    const sourceMemo = cleanString(source.memo);
    const sourceBlock = lines.length > 0 ? `[예비 창업자 등록 원본 정보]\n${lines.join('\n')}` : '';
    return [sourceMemo, sourceBlock].filter(Boolean).join('\n\n');
}

function buildSnapshot(source: FranchiseMatchingRequestPromotionRow): Record<string, unknown> {
    const data = source.data || {};
    return {
        id: source.id,
        companyId: source.company_id,
        managerId: source.manager_id,
        name: source.name || '',
        mobile: source.mobile || '',
        source: source.source || '',
        status: source.status || '',
        grade: source.grade || '',
        desiredRegion: source.desired_region || '',
        desiredCategory: readDataString(data, 'desiredCategory'),
        interestedBrand: source.interested_brand || '',
        budgetMin: source.budget_min,
        budgetMax: source.budget_max,
        totalBudget: readDataString(data, 'totalBudget'),
        memo: source.memo || '',
        createdAt: source.created_at || null,
        updatedAt: source.updated_at || null
    };
}

export function buildFranchiseMatchingRequestPromotionDraft(
    source: FranchiseMatchingRequestPromotionRow,
    targetCompanyId: string,
    selectedManagerId: string | null,
    promotedAt: string
): FranchiseMatchingRequestPromotionDraft {
    const data = source.data || {};
    const normalizedPhone = source.mobile_normalized || normalizeLeadPhone(source.mobile);
    return {
        company_id: targetCompanyId,
        manager_id: selectedManagerId,
        name: cleanString(source.name) || '이름 없음',
        mobile: source.mobile,
        mobile_normalized: normalizedPhone || null,
        source: FRANCHISE_MATCHING_REQUEST_SOURCE_LABEL,
        status: source.status || DEFAULT_FRANCHISE_LEAD_STATUS,
        grade: source.grade || gradeFromUrgency(readDataString(data, 'urgency')),
        desired_region: source.desired_region || readDataString(data, 'desiredRegion'),
        budget_min: source.budget_min,
        budget_max: source.budget_max ?? parseManwonToWon(data.totalBudget),
        interested_brand: source.interested_brand || readDataString(data, 'desiredBrand'),
        memo: buildMemo(source),
        next_contact_at: source.next_contact_at || null,
        data: {
            ...data,
            leadStage: 'raw_intake',
            sourceType: 'franchise_matching_request_promoted',
            matchingRequestId: source.id,
            matchingRequestSourceCompanyId: source.company_id,
            matchingRequestSourceSnapshot: buildSnapshot(source),
            intakePromotedAt: promotedAt
        }
    };
}

export function shouldUseSourceLeadForSameCompanyPromotion(
    source: FranchiseMatchingRequestPromotionRow,
    targetCompanyId: string
): boolean {
    return Boolean(source.company_id && source.company_id === targetCompanyId);
}
