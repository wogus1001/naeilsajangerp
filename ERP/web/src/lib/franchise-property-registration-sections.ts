import { DEFAULT_FRANCHISE_BUSINESS_TYPE_OPTIONS } from './franchise-industry-options';
import type { PropertyRegistrationForm } from './franchise-property-registration';

export type PropertyRegistrationFieldKey = keyof Omit<
    PropertyRegistrationForm,
    'fileNames' | 'fileAttachments' | 'privateAreaUnit' | 'propertyRegion' | 'roadAddress' | 'jibunAddress' | 'zoneNo'
>;

export type PropertyRegistrationField = {
    readonly key: PropertyRegistrationFieldKey;
    readonly label: string;
    readonly kind: 'text' | 'number' | 'date' | 'select' | 'textarea';
    readonly required?: boolean;
    readonly options?: readonly string[];
    readonly unit?: string;
    readonly wide?: boolean;
    readonly full?: boolean;
};

export type PropertyRegistrationSection = {
    readonly id: string;
    readonly title: string;
    readonly fields: readonly PropertyRegistrationField[];
};

export const PROPERTY_REGISTRATION_SECTIONS: readonly PropertyRegistrationSection[] = [
    {
        id: 'matching-condition',
        title: '입점 희망 조건',
        fields: [
            { key: 'desiredBrand', label: '입점 희망 브랜드', kind: 'text' },
            { key: 'desiredBusinessType', label: '업태 (대분류)', kind: 'select', options: DEFAULT_FRANCHISE_BUSINESS_TYPE_OPTIONS },
            { key: 'desiredCategory', label: '업종 (중분류)', kind: 'select', required: true, options: [''] },
            { key: 'matchPriority', label: '우선순위', kind: 'select', options: ['브랜드 우선', '지역 우선', '예산 우선', '수익성 우선'] }
        ]
    },
    {
        id: 'property-info',
        title: '물건 정보',
        fields: [
            { key: 'propertyName', label: '물건명', kind: 'text' },
            { key: 'propertyAddress', label: '물건 주소', kind: 'text', required: true, wide: true },
            { key: 'detailAddress', label: '상세 주소', kind: 'text', wide: true },
            { key: 'privateArea', label: '전용면적', kind: 'number', unit: '㎡' },
            { key: 'supplyArea', label: '공급면적', kind: 'number', unit: '㎡' },
            { key: 'floor', label: '층수', kind: 'number', unit: '층' },
            { key: 'totalFloors', label: '전체 층수', kind: 'number', unit: '층' },
            { key: 'parkingAvailable', label: '주차 가능 여부', kind: 'select', options: ['가능', '불가', '확인 필요'] },
            { key: 'currentStatus', label: '현재 상태', kind: 'select', options: ['공실', '영업중', '공사중', '확인 필요'] }
        ]
    },
    {
        id: 'lease-condition',
        title: '임대 조건',
        fields: [
            { key: 'deposit', label: '보증금', kind: 'number', required: true, unit: '만원' },
            { key: 'monthlyRent', label: '월세', kind: 'number', required: true, unit: '만원' },
            { key: 'maintenanceFee', label: '관리비', kind: 'number', unit: '만원' },
            { key: 'premium', label: '권리금', kind: 'number', unit: '만원' },
            { key: 'vatIncluded', label: '부가세 포함 여부', kind: 'select', options: ['포함', '별도', '확인 필요'] },
            { key: 'leaseAvailableDate', label: '임대 가능일', kind: 'date' },
            { key: 'contractPeriod', label: '계약 기간', kind: 'text' },
            { key: 'negotiable', label: '협의 가능 여부', kind: 'select', options: ['가능', '불가', '확인 필요'] }
        ]
    },
    {
        id: 'landlord-support',
        title: '임대인 지원 내용',
        fields: [
            { key: 'rentFreeAvailable', label: '렌트프리 가능 여부', kind: 'select', options: ['가능', '불가', '확인 필요'] },
            { key: 'rentFreePeriod', label: '렌트프리 가능 기간', kind: 'text' },
            { key: 'interiorSupportAvailable', label: '인테리어 지원 가능 여부', kind: 'select', options: ['가능', '불가', '확인 필요'] },
            { key: 'simpleInstallSupportAvailable', label: '간판 설치 지원 가능 여부', kind: 'select', options: ['가능', '불가', '확인 필요'] },
            { key: 'facilityWorkNegotiable', label: '시설 공사 협의 가능 여부', kind: 'select', options: ['가능', '불가', '확인 필요'] },
            { key: 'landlordSupportMemo', label: '기타 지원 내용', kind: 'textarea', full: true }
        ]
    },
    {
        id: 'internal-note',
        title: '내부 메모',
        fields: [
            { key: 'consultationMemo', label: '상담 메모', kind: 'textarea', wide: true },
            { key: 'riskMemo', label: '리스크 메모', kind: 'textarea' },
            { key: 'nextAction', label: '다음 액션', kind: 'select', options: ['임대인 재통화', '브랜드 제안', '현장 확인', '조건 재협의', '보류'] },
            { key: 'nextContactAt', label: '다음 연락 예정일', kind: 'date' }
        ]
    }
] as const;

export function buildPropertyRegistrationSections(
    industryOptions: readonly string[],
    businessTypeOptions: readonly string[] = DEFAULT_FRANCHISE_BUSINESS_TYPE_OPTIONS
): readonly PropertyRegistrationSection[] {
    return PROPERTY_REGISTRATION_SECTIONS.map(section => ({
        ...section,
        fields: section.fields.map(field => (
            field.key === 'desiredBusinessType'
                ? { ...field, options: businessTypeOptions }
                : field.key === 'desiredCategory'
                    ? { ...field, options: industryOptions }
                    : field
        ))
    }));
}
