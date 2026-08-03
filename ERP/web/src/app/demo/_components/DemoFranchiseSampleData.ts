import type {
    FranchiseLocation as LocationMasterItem,
    LocationManagerOption
} from '@/components/franchise/market-insights/locationMasterTypes';
import type { FranchiseLocation as OperationLocation } from '@/components/franchise/operations/types';
import type { DemoRole } from '../demoTypes';

export const DEMO_LOCATION_MANAGERS = [
    { id: 'manager-kim', displayId: 'manager-kim', name: '김담당', role: 'manager' },
    { id: 'manager-lee', displayId: 'manager-lee', name: '이팀장', role: 'sub_manager' },
    { id: 'partner-kim', displayId: 'partner-kim', name: '김재현', role: 'partner_vendor' }
] as const satisfies readonly LocationManagerOption[];

type DemoLocationSeed = {
    readonly id: string;
    readonly managerId: string;
    readonly name: string;
    readonly brand: string;
    readonly status: LocationMasterItem['status'];
    readonly region: string;
    readonly address: string;
    readonly addressDetail: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly memo: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly sourcePropertyId: string;
    readonly competitionKeyword: string;
    readonly brandId: string;
    readonly industry: string;
    readonly categoryMiddle: string;
    readonly developmentStage: LocationMasterItem['developmentStage'];
    readonly importance: LocationMasterItem['importance'];
    readonly areaPyeong: number;
    readonly deposit: number;
    readonly premium: number | null;
    readonly monthlyRent: number;
    readonly maintenanceFee: number;
    readonly openedAt?: string | null;
    readonly fileNames?: readonly string[];
};

type DemoOperationSeed = {
    readonly id: string;
    readonly managerId: string;
    readonly name: string;
    readonly locationType: OperationLocation['locationType'];
    readonly brand: string;
    readonly status: OperationLocation['status'];
    readonly region: string;
    readonly address: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly openedAt: string | null;
    readonly memo: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly sourcePropertyId?: string | null;
    readonly competitionKeyword: string;
    readonly brandId: string;
    readonly industry: string;
    readonly categoryMiddle: string;
};

export const DEMO_LOCATION_MASTER_ITEMS = [
    createDemoLocation({
        id: 'demo-location-gangnam-station',
        managerId: 'manager-kim',
        name: '강남역 1층 코너',
        brand: '미카도',
        status: '검토중',
        region: '서울 강남구',
        address: '서울 강남구 테헤란로 123',
        addressDetail: '1층 코너',
        latitude: 37.4982,
        longitude: 127.0281,
        memo: '평일 점심 유동이 강하고 권리금 조정 여지가 있어 1순위 검토 중입니다.',
        createdAt: '2026-06-17T02:00:00.000Z',
        updatedAt: '2026-06-24T03:00:00.000Z',
        sourcePropertyId: 'demo-property-gangnam-station',
        competitionKeyword: '일식',
        brandId: 'brand-mikado',
        industry: '일식',
        categoryMiddle: '일식',
        developmentStage: '개발중',
        importance: '높음',
        areaPyeong: 28,
        deposit: 7000,
        premium: 4500,
        monthlyRent: 520,
        maintenanceFee: 45,
        fileNames: ['강남역_도면.pdf', '매장전면.jpg']
    }),
    createDemoLocation({
        id: 'demo-location-seongsu-corner',
        managerId: 'manager-lee',
        name: '성수역 카페거리 코너',
        brand: '샘플카페',
        status: '검토중',
        region: '서울 성동구',
        address: '서울 성동구 아차산로 89',
        addressDetail: '코너 1층',
        latitude: 37.5446,
        longitude: 127.0557,
        memo: '주말 유입이 강하지만 임대료가 높아 매출 시뮬레이션 확인이 필요합니다.',
        createdAt: '2026-06-16T02:00:00.000Z',
        updatedAt: '2026-06-24T01:20:00.000Z',
        sourcePropertyId: 'demo-property-seongsu-corner',
        competitionKeyword: '카페',
        brandId: 'brand-cafe',
        industry: '커피',
        categoryMiddle: '커피',
        developmentStage: '개발중',
        importance: '높음',
        areaPyeong: 32,
        deposit: 10000,
        premium: 6000,
        monthlyRent: 680,
        maintenanceFee: 55,
        fileNames: ['성수_입지사진.zip']
    }),
    createDemoLocation({
        id: 'demo-location-songpa-lotte',
        managerId: 'manager-lee',
        name: '송파 대로변 카페 자리',
        brand: '샘플카페',
        status: '오픈준비',
        region: '서울 송파구',
        address: '서울 송파구 올림픽로 99',
        addressDetail: '대로변 1층',
        latitude: 37.5147,
        longitude: 127.1059,
        openedAt: '2026-08-01',
        memo: '가맹 희망자와 조건 협의 완료, 인테리어 실측 대기 중입니다.',
        createdAt: '2026-06-16T02:00:00.000Z',
        updatedAt: '2026-06-24T04:00:00.000Z',
        sourcePropertyId: 'demo-property-songpa-lotte',
        competitionKeyword: '카페',
        brandId: 'brand-cafe',
        industry: '커피',
        categoryMiddle: '커피',
        developmentStage: '물건화 완료',
        importance: '보통',
        areaPyeong: 34,
        deposit: 5000,
        premium: 3000,
        monthlyRent: 450,
        maintenanceFee: 30,
        fileNames: ['송파_임대조건.pdf']
    }),
    createDemoLocation({
        id: 'demo-location-mapo-office',
        managerId: 'partner-kim',
        name: '마포 오피스 상권 소형',
        brand: '미카도',
        status: '검토중',
        region: '서울 마포구',
        address: '서울 마포구 양화로 45',
        addressDetail: '오피스 상권 1층',
        latitude: 37.5539,
        longitude: 126.9187,
        memo: '협력업체 등록 샘플. 점심 수요는 좋지만 야간 매출 보완이 필요합니다.',
        createdAt: '2026-06-15T01:00:00.000Z',
        updatedAt: '2026-06-22T05:00:00.000Z',
        sourcePropertyId: 'demo-property-mapo-office',
        competitionKeyword: '분식',
        brandId: 'brand-mikado',
        industry: '분식',
        categoryMiddle: '분식',
        developmentStage: '개발중',
        importance: '낮음',
        areaPyeong: 18,
        deposit: 4000,
        premium: null,
        monthlyRent: 260,
        maintenanceFee: 20
    }),
    createDemoLocation({
        id: 'demo-location-suwon-station',
        managerId: 'manager-kim',
        name: '수원역 로데오 입구',
        brand: '미카도',
        status: '검토중',
        region: '경기 수원시',
        address: '경기 수원시 팔달구 매산로 21',
        addressDetail: '1층 전면',
        latitude: 37.2660,
        longitude: 127.0001,
        memo: '대학생 유입은 좋지만 야간 상권 민원 리스크 확인이 필요합니다.',
        createdAt: '2026-06-14T04:00:00.000Z',
        updatedAt: '2026-06-23T09:00:00.000Z',
        sourcePropertyId: 'demo-property-suwon-station',
        competitionKeyword: '일식',
        brandId: 'brand-mikado',
        industry: '일식',
        categoryMiddle: '일식',
        developmentStage: '개발중',
        importance: '보통',
        areaPyeong: 26,
        deposit: 6000,
        premium: 2500,
        monthlyRent: 390,
        maintenanceFee: 25
    }),
    createDemoLocation({
        id: 'demo-location-busan-centum',
        managerId: 'manager-lee',
        name: '부산 센텀 오피스몰',
        brand: '샘플카페',
        status: '오픈준비',
        region: '부산 해운대구',
        address: '부산 해운대구 센텀중앙로 48',
        addressDetail: '몰 1층',
        latitude: 35.1696,
        longitude: 129.1310,
        openedAt: '2026-08-20',
        memo: '오피스 점심 수요가 안정적이며 오픈 물류 일정만 남았습니다.',
        createdAt: '2026-06-13T02:30:00.000Z',
        updatedAt: '2026-06-24T02:10:00.000Z',
        sourcePropertyId: 'demo-property-busan-centum',
        competitionKeyword: '카페',
        brandId: 'brand-cafe',
        industry: '커피',
        categoryMiddle: '커피',
        developmentStage: '물건화 완료',
        importance: '높음',
        areaPyeong: 30,
        deposit: 5000,
        premium: 1800,
        monthlyRent: 360,
        maintenanceFee: 38
    }),
    createDemoLocation({
        id: 'demo-location-daegu-dongseong',
        managerId: 'manager-kim',
        name: '대구 동성로 골목 상권',
        brand: '미카도',
        status: '검토중',
        region: '대구 중구',
        address: '대구 중구 동성로 19',
        addressDetail: '골목 코너',
        latitude: 35.8693,
        longitude: 128.5957,
        memo: '경쟁점은 많지만 임대 조건이 좋아 테스트 매장 후보로 검토합니다.',
        createdAt: '2026-06-12T06:00:00.000Z',
        updatedAt: '2026-06-23T04:40:00.000Z',
        sourcePropertyId: 'demo-property-daegu-dongseong',
        competitionKeyword: '일식',
        brandId: 'brand-mikado',
        industry: '일식',
        categoryMiddle: '일식',
        developmentStage: '개발중',
        importance: '보통',
        areaPyeong: 22,
        deposit: 3500,
        premium: 1200,
        monthlyRent: 280,
        maintenanceFee: 22
    }),
    createDemoLocation({
        id: 'demo-location-incheon-guwol',
        managerId: 'partner-kim',
        name: '인천 구월동 병원가',
        brand: '샘플치킨',
        status: '검토중',
        region: '인천 남동구',
        address: '인천 남동구 인하로 507',
        addressDetail: '병원가 1층',
        latitude: 37.4486,
        longitude: 126.7020,
        memo: '점심과 저녁 수요가 모두 있으나 배달 동선 확인이 필요합니다.',
        createdAt: '2026-06-11T05:00:00.000Z',
        updatedAt: '2026-06-21T03:30:00.000Z',
        sourcePropertyId: 'demo-property-incheon-guwol',
        competitionKeyword: '치킨',
        brandId: 'brand-chicken',
        industry: '치킨',
        categoryMiddle: '치킨',
        developmentStage: '개발중',
        importance: '보통',
        areaPyeong: 24,
        deposit: 4500,
        premium: 2200,
        monthlyRent: 310,
        maintenanceFee: 18
    }),
    createDemoLocation({
        id: 'demo-location-daejeon-dunsan',
        managerId: 'manager-lee',
        name: '대전 둔산 법원 상권',
        brand: '미카도',
        status: '검토중',
        region: '대전 서구',
        address: '대전 서구 둔산중로 65',
        addressDetail: '대로변 1층',
        latitude: 36.3505,
        longitude: 127.3848,
        memo: '평일 점심 수요가 강하고 토요일 매출 보완책이 필요합니다.',
        createdAt: '2026-06-10T03:20:00.000Z',
        updatedAt: '2026-06-20T08:00:00.000Z',
        sourcePropertyId: 'demo-property-daejeon-dunsan',
        competitionKeyword: '일식',
        brandId: 'brand-mikado',
        industry: '일식',
        categoryMiddle: '일식',
        developmentStage: '개발중',
        importance: '낮음',
        areaPyeong: 20,
        deposit: 3000,
        premium: 900,
        monthlyRent: 240,
        maintenanceFee: 16
    }),
    createDemoLocation({
        id: 'demo-location-jeju-city',
        managerId: 'manager-kim',
        name: '제주 시청 먹자골목',
        brand: '샘플치킨',
        status: '검토중',
        region: '제주 제주시',
        address: '제주 제주시 중앙로 120',
        addressDetail: '2층 단독',
        latitude: 33.5008,
        longitude: 126.5297,
        memo: '관광객보다 지역 상권 기반으로 보며 계단 접근성을 확인해야 합니다.',
        createdAt: '2026-06-09T07:30:00.000Z',
        updatedAt: '2026-06-19T04:00:00.000Z',
        sourcePropertyId: 'demo-property-jeju-city',
        competitionKeyword: '치킨',
        brandId: 'brand-chicken',
        industry: '치킨',
        categoryMiddle: '치킨',
        developmentStage: '개발중',
        importance: '낮음',
        areaPyeong: 31,
        deposit: 2800,
        premium: 700,
        monthlyRent: 210,
        maintenanceFee: 14
    })
] satisfies readonly LocationMasterItem[];

export const DEMO_OPERATION_LOCATIONS = [
    createDemoOperation({
        id: 'demo-operation-gangnam',
        managerId: 'manager-kim',
        name: '미카도 강남역점',
        locationType: '가맹점',
        brand: '미카도',
        status: '운영중',
        region: '서울 강남구',
        address: '서울 강남구 테헤란로 132',
        latitude: 37.5008,
        longitude: 127.0265,
        openedAt: '2025-11-18',
        memo: '평일 점심 피크가 안정적이며 리뷰 응대는 주 2회 확인합니다.',
        createdAt: '2025-10-10T02:00:00.000Z',
        updatedAt: '2026-06-24T02:00:00.000Z',
        sourcePropertyId: 'demo-property-open-gangnam',
        competitionKeyword: '일식',
        brandId: 'brand-mikado',
        industry: '일식',
        categoryMiddle: '일식'
    }),
    createDemoOperation({
        id: 'demo-operation-seongsu',
        managerId: 'manager-lee',
        name: '미카도 성수점',
        locationType: '직영점',
        brand: '미카도',
        status: '운영중',
        region: '서울 성동구',
        address: '서울 성동구 왕십리로 92',
        latitude: 37.5441,
        longitude: 127.0554,
        openedAt: '2026-02-14',
        memo: '주말 웨이팅이 길어 홀 동선 개선 요청이 있습니다.',
        createdAt: '2026-01-08T04:00:00.000Z',
        updatedAt: '2026-06-24T05:00:00.000Z',
        sourcePropertyId: 'demo-property-open-seongsu',
        competitionKeyword: '일식',
        brandId: 'brand-mikado',
        industry: '일식',
        categoryMiddle: '일식'
    }),
    createDemoOperation({
        id: 'demo-operation-songpa',
        managerId: 'manager-lee',
        name: '샘플카페 송파점',
        locationType: '가맹점',
        brand: '샘플카페',
        status: '오픈준비',
        region: '서울 송파구',
        address: '서울 송파구 올림픽로 107',
        latitude: 37.5122,
        longitude: 127.1028,
        openedAt: '2026-08-01',
        memo: '교육 일정 확정 후 초도물류 발주를 진행합니다.',
        createdAt: '2026-06-04T02:00:00.000Z',
        updatedAt: '2026-06-24T06:00:00.000Z',
        sourcePropertyId: 'demo-property-songpa-lotte',
        competitionKeyword: '카페',
        brandId: 'brand-cafe',
        industry: '커피',
        categoryMiddle: '커피'
    }),
    createDemoOperation({
        id: 'demo-operation-bundang',
        managerId: 'manager-kim',
        name: '미카도 판교테크노점',
        locationType: '가맹점',
        brand: '미카도',
        status: '운영중',
        region: '경기 성남시',
        address: '경기 성남시 분당구 판교역로 235',
        latitude: 37.3947,
        longitude: 127.1114,
        openedAt: '2025-09-05',
        memo: '오피스 상권 매출은 안정적이고 주말 매출은 낮은 편입니다.',
        createdAt: '2025-08-01T03:00:00.000Z',
        updatedAt: '2026-06-23T03:30:00.000Z',
        sourcePropertyId: 'demo-property-open-bundang',
        competitionKeyword: '일식',
        brandId: 'brand-mikado',
        industry: '일식',
        categoryMiddle: '일식'
    }),
    createDemoOperation({
        id: 'demo-operation-busan',
        managerId: 'manager-lee',
        name: '샘플카페 센텀점',
        locationType: '가맹점',
        brand: '샘플카페',
        status: '오픈준비',
        region: '부산 해운대구',
        address: '부산 해운대구 센텀남대로 35',
        latitude: 35.1689,
        longitude: 129.1317,
        openedAt: '2026-08-20',
        memo: '간판 시안 승인 대기 중이며 오픈 프로모션 물량을 조정합니다.',
        createdAt: '2026-06-05T02:00:00.000Z',
        updatedAt: '2026-06-24T05:20:00.000Z',
        sourcePropertyId: 'demo-property-busan-centum',
        competitionKeyword: '카페',
        brandId: 'brand-cafe',
        industry: '커피',
        categoryMiddle: '커피'
    }),
    createDemoOperation({
        id: 'demo-operation-daegu',
        managerId: 'manager-kim',
        name: '미카도 동성로점',
        locationType: '가맹점',
        brand: '미카도',
        status: '휴점',
        region: '대구 중구',
        address: '대구 중구 동성로2길 12',
        latitude: 35.8689,
        longitude: 128.5945,
        openedAt: '2025-12-03',
        memo: '건물 누수 보수로 임시 휴점 중입니다.',
        createdAt: '2025-11-01T02:00:00.000Z',
        updatedAt: '2026-06-22T04:00:00.000Z',
        sourcePropertyId: 'demo-property-open-daegu',
        competitionKeyword: '일식',
        brandId: 'brand-mikado',
        industry: '일식',
        categoryMiddle: '일식'
    }),
    createDemoOperation({
        id: 'demo-operation-ilsan',
        managerId: 'partner-kim',
        name: '샘플치킨 일산점',
        locationType: '가맹점',
        brand: '샘플치킨',
        status: '운영중',
        region: '경기 고양시',
        address: '경기 고양시 일산동구 중앙로 1205',
        latitude: 37.6564,
        longitude: 126.7728,
        openedAt: '2026-03-22',
        memo: '배달앱 평점이 좋아 리뷰 고도화 샘플로 활용합니다.',
        createdAt: '2026-02-01T02:30:00.000Z',
        updatedAt: '2026-06-23T08:10:00.000Z',
        sourcePropertyId: 'demo-property-open-ilsan',
        competitionKeyword: '치킨',
        brandId: 'brand-chicken',
        industry: '치킨',
        categoryMiddle: '치킨'
    }),
    createDemoOperation({
        id: 'demo-operation-jeju',
        managerId: 'manager-kim',
        name: '샘플치킨 제주점',
        locationType: '가맹점',
        brand: '샘플치킨',
        status: '운영중',
        region: '제주 제주시',
        address: '제주 제주시 연북로 24',
        latitude: 33.4899,
        longitude: 126.4983,
        openedAt: '2025-07-12',
        memo: '성수기 대비 물류 리드타임 관리가 중요합니다.',
        createdAt: '2025-06-02T02:00:00.000Z',
        updatedAt: '2026-06-20T02:00:00.000Z',
        sourcePropertyId: 'demo-property-open-jeju',
        competitionKeyword: '치킨',
        brandId: 'brand-chicken',
        industry: '치킨',
        categoryMiddle: '치킨'
    })
] satisfies readonly OperationLocation[];

export function selectDemoLocationMasterItems(role: DemoRole): readonly LocationMasterItem[] {
    if (role === 'admin') return DEMO_LOCATION_MASTER_ITEMS;
    const managerId = role === 'partner' ? 'partner-kim' : 'manager-kim';
    return DEMO_LOCATION_MASTER_ITEMS.filter(location => location.managerId === managerId);
}

export function selectDemoOperationLocations(role: DemoRole): readonly OperationLocation[] {
    if (role === 'admin') return DEMO_OPERATION_LOCATIONS;
    const managerId = role === 'partner' ? 'partner-kim' : 'manager-kim';
    return DEMO_OPERATION_LOCATIONS.filter(location => location.managerId === managerId);
}

function createDemoLocation(seed: DemoLocationSeed): LocationMasterItem {
    return {
        id: seed.id,
        companyId: 'demo-company',
        managerId: seed.managerId,
        managerName: getDemoManagerName(seed.managerId),
        name: seed.name,
        locationType: '예정점',
        brand: seed.brand,
        status: seed.status,
        region: seed.region,
        address: seed.address,
        addressDetail: seed.addressDetail,
        latitude: seed.latitude,
        longitude: seed.longitude,
        openedAt: seed.openedAt || null,
        memo: seed.memo,
        createdAt: seed.createdAt,
        updatedAt: seed.updatedAt,
        sourcePropertyId: seed.sourcePropertyId,
        competitionKeyword: seed.competitionKeyword,
        brandId: seed.brandId,
        industry: seed.industry,
        businessType: '요식업',
        categoryMajor: '요식업',
        categoryMiddle: seed.categoryMiddle,
        categorySmall: '',
        developmentStage: seed.developmentStage,
        importance: seed.importance,
        fileNames: seed.fileNames || [],
        fileAttachments: [],
        siteCondition: {
            exclusiveAreaPyeong: seed.areaPyeong,
            exclusiveAreaMemo: `전용 ${seed.areaPyeong}평, 현장 실측 기준`,
            restroom: { value: '미확인', memo: '계약 전 재확인 필요' },
            elevator: { value: '미확인', memo: '' },
            demolition: { value: '미확인', memo: '철거 범위 협의 필요' },
            parking: { value: seed.region.startsWith('서울') ? '없음' : '있음', memo: '' }
        },
        landlord: {
            name: '',
            phone: '',
            tendency: seed.premium ? '권리금 협의 필요' : '권리금 없음 또는 미정'
        },
        cost: {
            deposit: seed.deposit,
            premium: seed.premium,
            memo: '데모 임대 조건'
        },
        lease: {
            monthlyRent: seed.monthlyRent,
            maintenanceFee: seed.maintenanceFee,
            memo: '부가세 별도 여부 확인'
        }
    };
}

function createDemoOperation(seed: DemoOperationSeed): OperationLocation {
    return {
        id: seed.id,
        companyId: 'demo-company',
        managerId: seed.managerId,
        name: seed.name,
        locationType: seed.locationType,
        brand: seed.brand,
        status: seed.status,
        region: seed.region,
        address: seed.address,
        latitude: seed.latitude,
        longitude: seed.longitude,
        openedAt: seed.openedAt,
        memo: seed.memo,
        createdAt: seed.createdAt,
        updatedAt: seed.updatedAt,
        sourcePropertyId: seed.sourcePropertyId || null,
        competitionKeyword: seed.competitionKeyword,
        brandId: seed.brandId,
        industry: seed.industry,
        businessType: '요식업',
        categoryMajor: '요식업',
        categoryMiddle: seed.categoryMiddle,
        categorySmall: ''
    };
}

function getDemoManagerName(managerId: string): string {
    return DEMO_LOCATION_MANAGERS.find(manager => manager.id === managerId)?.name || '담당자 미정';
}
