import type {
    FranchiseLocation as LocationMasterItem,
    LocationManagerOption
} from '@/components/franchise/market-insights/locationMasterTypes';
import type { FranchiseLocation as OperationLocation } from '@/components/franchise/operations/types';

export const DEMO_LOCATION_MANAGERS = [
    { id: 'manager-kim', displayId: 'manager-kim', name: '김담당', role: 'manager' },
    { id: 'manager-lee', displayId: 'manager-lee', name: '이팀장', role: 'sub_manager' },
    { id: 'partner-kim', displayId: 'partner-kim', name: '김재현', role: 'partner_vendor' }
] as const satisfies readonly LocationManagerOption[];

export const DEMO_LOCATION_MASTER_ITEMS = [
    {
        id: 'demo-location-1',
        companyId: 'demo-company',
        managerId: 'manager-kim',
        managerName: '김담당',
        name: '강남역 1층 코너',
        locationType: '예정점',
        brand: '미카도',
        status: '검토중',
        region: '서울 강남구',
        address: '서울 강남구 테헤란로 123',
        addressDetail: '1층 코너',
        latitude: null,
        longitude: null,
        openedAt: null,
        memo: '대로변 유동인구가 많고 일식 브랜드 우선 검토 중입니다.',
        createdAt: '2026-06-17T02:00:00.000Z',
        updatedAt: '2026-06-19T03:00:00.000Z',
        sourcePropertyId: 'demo-property-1',
        competitionKeyword: '일식',
        brandId: 'brand-mikado',
        industry: '일식',
        businessType: '요식업',
        categoryMajor: '요식업',
        categoryMiddle: '일식',
        categorySmall: '',
        developmentStage: '개발중',
        importance: '높음',
        fileNames: ['강남역_도면.pdf', '매장전면.jpg'],
        fileAttachments: [],
        siteCondition: {
            exclusiveAreaPyeong: 28,
            exclusiveAreaMemo: '전용 28평, 주차 협의 가능',
            restroom: { value: '미확인', memo: '건물 공용 확인 필요' },
            elevator: { value: '미확인', memo: '' },
            demolition: { value: '있음', memo: '기존 인테리어 철거 협의' },
            parking: { value: '있음', memo: '건물 후면 1대 가능' }
        },
        landlord: {
            name: '',
            phone: '',
            tendency: '권리금 최종 확인 필요'
        },
        cost: {
            deposit: 7000,
            premium: 4500,
            memo: '권리금 협의 여지 있음'
        },
        lease: {
            monthlyRent: 520,
            maintenanceFee: 45,
            memo: '렌트프리 1개월 협의 가능'
        }
    },
    {
        id: 'demo-location-2',
        companyId: 'demo-company',
        managerId: 'manager-lee',
        managerName: '이팀장',
        name: '송파 대로변 카페 자리',
        locationType: '예정점',
        brand: '샘플카페',
        status: '오픈준비',
        region: '서울 송파구',
        address: '서울 송파구 올림픽로 99',
        addressDetail: '대로변 1층',
        latitude: null,
        longitude: null,
        openedAt: '2026-08-01',
        memo: '카페 업종 우선 검토, 배후 오피스 수요 확인 필요.',
        createdAt: '2026-06-16T02:00:00.000Z',
        updatedAt: '2026-06-18T04:00:00.000Z',
        sourcePropertyId: 'demo-property-2',
        competitionKeyword: '카페',
        brandId: 'brand-cafe',
        industry: '커피',
        businessType: '요식업',
        categoryMajor: '요식업',
        categoryMiddle: '커피',
        categorySmall: '',
        developmentStage: '물건화 완료',
        importance: '보통',
        fileNames: ['송파_입지사진.zip'],
        fileAttachments: [],
        siteCondition: {
            exclusiveAreaPyeong: 34,
            exclusiveAreaMemo: '전용 34평, 전면 폭 양호',
            restroom: { value: '있음', memo: '내부 화장실' },
            elevator: { value: '없음', memo: '' },
            demolition: { value: '미확인', memo: '' },
            parking: { value: '없음', memo: '인근 공영주차장 이용' }
        },
        landlord: {
            name: '',
            phone: '',
            tendency: '임대료 조정 폭 작음'
        },
        cost: {
            deposit: 5000,
            premium: 3000,
            memo: '보증금 조정 가능성 낮음'
        },
        lease: {
            monthlyRent: 450,
            maintenanceFee: 30,
            memo: '부가세 별도'
        }
    },
    {
        id: 'demo-location-3',
        companyId: 'demo-company',
        managerId: 'partner-kim',
        managerName: '김재현',
        name: '마포 오피스 상권 소형',
        locationType: '예정점',
        brand: '미카도',
        status: '검토중',
        region: '서울 마포구',
        address: '서울 마포구 양화로 45',
        addressDetail: '오피스 상권 1층',
        latitude: null,
        longitude: null,
        openedAt: null,
        memo: '협력업체 등록 샘플. 본사 임직원과 작성 협력업체만 확인 가능합니다.',
        createdAt: '2026-06-15T01:00:00.000Z',
        updatedAt: '2026-06-17T05:00:00.000Z',
        sourcePropertyId: 'demo-property-3',
        competitionKeyword: '분식',
        brandId: 'brand-mikado',
        industry: '분식',
        businessType: '요식업',
        categoryMajor: '요식업',
        categoryMiddle: '분식',
        categorySmall: '',
        developmentStage: '개발중',
        importance: '낮음',
        fileNames: [],
        fileAttachments: [],
        siteCondition: {
            exclusiveAreaPyeong: 18,
            exclusiveAreaMemo: '소형 매장 테스트 가능',
            restroom: { value: '미확인', memo: '' },
            elevator: { value: '없음', memo: '' },
            demolition: { value: '미확인', memo: '' },
            parking: { value: '없음', memo: '' }
        },
        landlord: {
            name: '',
            phone: '',
            tendency: '초기 조건 협의 가능'
        },
        cost: {
            deposit: 4000,
            premium: null,
            memo: '권리금 미정'
        },
        lease: {
            monthlyRent: 260,
            maintenanceFee: 20,
            memo: '관리비 포함 항목 확인 필요'
        }
    }
] as const satisfies readonly LocationMasterItem[];

export const DEMO_OPERATION_LOCATIONS = DEMO_LOCATION_MASTER_ITEMS.map(location => ({
    id: `operation-${location.id}`,
    companyId: location.companyId,
    managerId: location.managerId,
    name: location.name.replace('자리', '점'),
    locationType: location.status === '오픈준비' ? '가맹점' : '직영점',
    brand: location.brand,
    status: location.status === '오픈준비' ? '오픈준비' : '운영중',
    region: location.region,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    openedAt: location.status === '오픈준비' ? location.openedAt : '2026-04-01',
    memo: location.memo,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
    sourcePropertyId: location.sourcePropertyId,
    competitionKeyword: location.competitionKeyword,
    brandId: location.brandId,
    industry: location.industry,
    businessType: location.businessType,
    categoryMajor: location.categoryMajor,
    categoryMiddle: location.categoryMiddle,
    categorySmall: location.categorySmall
})) satisfies readonly OperationLocation[];
