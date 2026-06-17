import { FRANCHISE_MATCHING_REQUEST_SOURCE } from './franchise-leads';
import { DEFAULT_FRANCHISE_INDUSTRY_OPTIONS } from './franchise-industry-options';

export type MatchingRequestForm = {
    readonly name: string;
    readonly mobile: string;
    readonly email: string;
    readonly residence: string;
    readonly currentJob: string;
    readonly startupExperience: string;
    readonly decisionMaker: string;
    readonly startupTiming: string;
    readonly desiredCategory: string;
    readonly desiredBrand: string;
    readonly brandUnknown: boolean;
    readonly brandPreference: string;
    readonly totalBudget: string;
    readonly ownCapital: string;
    readonly loanPreference: string;
    readonly desiredDeposit: string;
    readonly desiredRent: string;
    readonly desiredPremium: string;
    readonly desiredSize: string;
    readonly desiredFloor: string;
    readonly desiredRegion: string;
    readonly excludedRegion: string;
    readonly ownedPropertyStatus: string;
    readonly ownedPropertyName: string;
    readonly ownedPropertyAddress: string;
    readonly ownedPropertyAddressDetail: string;
    readonly ownedArea: string;
    readonly ownedFloor: string;
    readonly ownedDeposit: string;
    readonly ownedRent: string;
    readonly ownedMaintenance: string;
    readonly ownedPremium: string;
    readonly ownedCurrentStatus: string;
    readonly ownerAgreement: string;
    readonly ownedDescription: string;
    readonly matchPriority: string;
    readonly proposalRange: string;
    readonly urgency: string;
    readonly extraRequest: string;
    readonly summaryNote: string;
    readonly riskMemo: string;
    readonly recommendedBrands: string;
    readonly recommendedProperties: string;
    readonly nextAction: string;
};

export type MatchingRequestFieldKey = keyof MatchingRequestForm;

export type MatchingRequestField = {
    readonly key: MatchingRequestFieldKey;
    readonly label: string;
    readonly kind: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox';
    readonly required?: boolean;
    readonly options?: readonly string[];
    readonly unit?: string;
    readonly wide?: boolean;
    readonly full?: boolean;
};

export type MatchingRequestSection = {
    readonly id: string;
    readonly title: string;
    readonly fields: readonly MatchingRequestField[];
};

export type MatchingRequestPayloadContext = {
    readonly requesterId: string;
    readonly companyName: string;
};

export const MATCHING_REQUEST_INITIAL_FORM: MatchingRequestForm = {
    name: '',
    mobile: '',
    email: '',
    residence: '',
    currentJob: '',
    startupExperience: '없음',
    decisionMaker: '본인',
    startupTiming: '',
    desiredCategory: '',
    desiredBrand: '',
    brandUnknown: false,
    brandPreference: '특정 브랜드 희망',
    totalBudget: '',
    ownCapital: '',
    loanPreference: '희망',
    desiredDeposit: '',
    desiredRent: '',
    desiredPremium: '',
    desiredSize: '',
    desiredFloor: '',
    desiredRegion: '',
    excludedRegion: '',
    ownedPropertyStatus: '',
    ownedPropertyName: '',
    ownedPropertyAddress: '',
    ownedPropertyAddressDetail: '',
    ownedArea: '',
    ownedFloor: '',
    ownedDeposit: '',
    ownedRent: '',
    ownedMaintenance: '',
    ownedPremium: '',
    ownedCurrentStatus: '',
    ownerAgreement: '협의 완료',
    ownedDescription: '',
    matchPriority: '브랜드 우선',
    proposalRange: '동일 업종만',
    urgency: '낮음',
    extraRequest: '',
    summaryNote: '',
    riskMemo: '',
    recommendedBrands: '',
    recommendedProperties: '',
    nextAction: '브랜드 제안'
};

export const MATCHING_REQUEST_SECTIONS: readonly MatchingRequestSection[] = [
    {
        id: 'applicant',
        title: '예비 창업자 정보',
        fields: [
            { key: 'name', label: '신청자 이름', kind: 'text', required: true },
            { key: 'mobile', label: '연락처', kind: 'text', required: true },
            { key: 'email', label: '이메일', kind: 'email' },
            { key: 'residence', label: '거주 지역', kind: 'text' },
            { key: 'currentJob', label: '현재 직업', kind: 'text' },
            { key: 'startupExperience', label: '창업 경험 여부', kind: 'select', options: ['없음', '1회', '2회 이상'] },
            { key: 'decisionMaker', label: '의사결정자 여부', kind: 'select', options: ['본인', '가족 협의 필요', '공동창업자 있음'] },
            { key: 'startupTiming', label: '창업 가능 시기', kind: 'text' }
        ]
    },
    {
        id: 'brand',
        title: '희망 업종 및 브랜드',
        fields: [
            { key: 'desiredCategory', label: '희망 업종', kind: 'select', required: true, options: DEFAULT_FRANCHISE_INDUSTRY_OPTIONS },
            { key: 'desiredBrand', label: '희망 브랜드', kind: 'text' },
            { key: 'brandUnknown', label: '브랜드 미정', kind: 'checkbox' },
            { key: 'brandPreference', label: '브랜드 선호도', kind: 'select', options: ['특정 브랜드 희망', '유사 브랜드 추천 가능', '업종만 맞으면 무관'] }
        ]
    },
    {
        id: 'budget',
        title: '창업 예산 및 임대 조건',
        fields: [
            { key: 'totalBudget', label: '총 창업 예산', kind: 'number', required: true, unit: '만원' },
            { key: 'ownCapital', label: '자기자본', kind: 'number', unit: '만원' },
            { key: 'loanPreference', label: '대출 희망 여부', kind: 'select', options: ['희망', '미희망', '상담 필요'] },
            { key: 'desiredDeposit', label: '희망 보증금', kind: 'number', unit: '만원' },
            { key: 'desiredRent', label: '희망 월세', kind: 'number', unit: '만원' },
            { key: 'desiredPremium', label: '희망 권리금', kind: 'number', unit: '만원' },
            { key: 'desiredSize', label: '희망 평수', kind: 'number', unit: '평' },
            { key: 'desiredFloor', label: '희망 층수', kind: 'number', unit: '층' },
            { key: 'desiredRegion', label: '창업 희망 지역', kind: 'text', required: true },
            { key: 'excludedRegion', label: '제외 지역', kind: 'text' }
        ]
    },
    {
        id: 'owned-property',
        title: '입점 희망 물건 보유 여부',
        fields: [
            { key: 'ownedPropertyStatus', label: '입점 희망 물건 보유 여부', kind: 'select', required: true, options: ['', '보유', '미보유', '확인 필요'] }
        ]
    },
    {
        id: 'owned-property-detail',
        title: '보유 물건 정보',
        fields: [
            { key: 'ownedPropertyName', label: '보유 물건명', kind: 'text' },
            { key: 'ownedPropertyAddress', label: '보유 물건 주소', kind: 'text', wide: true },
            { key: 'ownedPropertyAddressDetail', label: '상세 주소', kind: 'text', wide: true },
            { key: 'ownedArea', label: '전용면적', kind: 'number', unit: '㎡' },
            { key: 'ownedFloor', label: '층수', kind: 'number', unit: '층' },
            { key: 'ownedDeposit', label: '보증금', kind: 'number', unit: '만원' },
            { key: 'ownedRent', label: '월세', kind: 'number', unit: '만원' },
            { key: 'ownedMaintenance', label: '관리비', kind: 'number', unit: '만원' },
            { key: 'ownedPremium', label: '권리금', kind: 'number', unit: '만원' },
            { key: 'ownedCurrentStatus', label: '현재 상태', kind: 'text' },
            { key: 'ownerAgreement', label: '임대인 협의 여부', kind: 'select', options: ['협의 완료', '협의 중', '미협의', '확인 필요'] },
            { key: 'ownedDescription', label: '물건 설명', kind: 'textarea', full: true }
        ]
    },
    {
        id: 'matching-condition',
        title: '매칭 요청 조건',
        fields: [
            { key: 'matchPriority', label: '매칭 우선순위', kind: 'select', options: ['브랜드 우선', '지역 우선', '예산 우선', '수익성 우선'] },
            { key: 'proposalRange', label: '제안 가능 범위', kind: 'select', options: ['동일 업종만', '유사 업종 가능', '다른 업종도 제안 가능'] },
            { key: 'urgency', label: '긴급도', kind: 'select', options: ['낮음', '보통', '높음', '즉시 상담 필요'] },
            { key: 'extraRequest', label: '추가 요청사항', kind: 'textarea', full: true }
        ]
    },
    {
        id: 'internal-note',
        title: '내부 메모',
        fields: [
            { key: 'summaryNote', label: '상담 요약', kind: 'textarea', wide: true },
            { key: 'riskMemo', label: '리스크 메모', kind: 'textarea' },
            { key: 'recommendedBrands', label: '추천 브랜드 후보', kind: 'textarea' },
            { key: 'recommendedProperties', label: '추천 물건 후보', kind: 'textarea' },
            { key: 'nextAction', label: '다음 액션', kind: 'select', options: ['브랜드 제안', '물건 제안', '예산 재확인', '대출 상담 연결', '보류'] }
        ]
    }
] as const;

export function buildMatchingRequestSections(industryOptions: readonly string[]): readonly MatchingRequestSection[] {
    return MATCHING_REQUEST_SECTIONS.map(section => ({
        ...section,
        fields: section.fields.map(field => (
            field.key === 'desiredCategory'
                ? { ...field, options: industryOptions }
                : field
        ))
    }));
}

function joinMemo(form: MatchingRequestForm): string {
    return [form.summaryNote, form.extraRequest, form.riskMemo]
        .map(item => item.trim())
        .filter(Boolean)
        .join('\n\n');
}

export function buildMatchingRequestPayload(form: MatchingRequestForm, context: MatchingRequestPayloadContext) {
    const interestedBrand = form.brandUnknown ? '브랜드 미정' : form.desiredBrand.trim();

    return {
        ...form,
        requesterId: context.requesterId,
        managerId: context.requesterId,
        companyName: context.companyName,
        source: FRANCHISE_MATCHING_REQUEST_SOURCE,
        status: '문의접수',
        leadStage: 'raw_intake',
        sourceType: 'franchise_matching_request',
        desiredRegion: form.desiredRegion,
        budgetMax: form.totalBudget,
        interestedBrand,
        memo: joinMemo(form)
    };
}
