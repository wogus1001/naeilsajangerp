import type { FranchiseLead } from '@/components/franchise/leads/types';
import type { FranchiseLeadStatus } from '@/lib/franchise-leads';
import type { DemoRole } from '../demoTypes';

export const DEMO_LEAD_MANAGERS = [
    { id: 'manager-kim', label: '김담당' },
    { id: 'manager-lee', label: '이팀장' },
    { id: 'partner-kim', label: '협력업체-김재현' }
] as const;

export const DEMO_SAMPLE_LEADS: readonly FranchiseLead[] = [
    createLead({
        id: 'demo-raw-1',
        name: '김민준',
        mobile: '010-4101-1011',
        layer: 'raw_intake',
        status: '상담중',
        grade: 'HOT',
        desiredRegion: '서울 강남구',
        budgetMin: 12000,
        budgetMax: 18000,
        interestedBrand: '미카도',
        source: 'Meta Lead Ads',
        managerId: 'manager-kim',
        nextContactAt: '2026-06-25T06:00:00.000Z',
        nextAction: '오늘 연락',
        consultationResult: '연락 성공',
        memo: '강남권 직장인 상권 선호. 권리금 5천만원 이하 후보지 우선 요청.',
        createdAt: '2026-06-24T07:00:00.000Z',
        updatedAt: '2026-06-24T08:30:00.000Z'
    }),
    createLead({
        id: 'demo-raw-2',
        name: '박서연',
        mobile: '010-4101-1012',
        layer: 'raw_intake',
        status: '문의접수',
        grade: 'WARM',
        desiredRegion: '서울 송파구',
        budgetMin: 9000,
        budgetMax: 13000,
        interestedBrand: '샘플카페',
        source: '랜딩페이지',
        managerId: 'manager-kim',
        nextContactAt: '2026-06-26T01:30:00.000Z',
        nextAction: '자료 발송',
        consultationResult: '미상담',
        memo: '부부 공동 창업 문의. 카페와 분식 브랜드 비교 자료 요청.',
        createdAt: '2026-06-24T01:30:00.000Z',
        updatedAt: '2026-06-24T01:30:00.000Z'
    }),
    createLead({
        id: 'demo-raw-3',
        name: '문태오',
        mobile: '010-4101-1013',
        layer: 'raw_intake',
        status: '가맹검토',
        grade: 'COLD',
        desiredRegion: '인천 남동구',
        budgetMin: 7000,
        budgetMax: 11000,
        interestedBrand: '샘플치킨',
        source: '전화문의',
        managerId: 'partner-kim',
        nextContactAt: '2026-06-27T03:00:00.000Z',
        nextAction: '예산 재확인',
        consultationResult: '조건 조율',
        memo: '현재 직장 병행 창업 검토. 배달형 매장만 관심 있음.',
        createdAt: '2026-06-23T05:20:00.000Z',
        updatedAt: '2026-06-24T02:10:00.000Z'
    }),
    createLead({
        id: 'demo-raw-4',
        name: '오지훈',
        mobile: '010-4101-1014',
        layer: 'raw_intake',
        status: '보류/이탈',
        grade: 'COLD',
        desiredRegion: '대전 서구',
        budgetMin: 5000,
        budgetMax: 8000,
        interestedBrand: '미카도',
        source: '고객DB',
        managerId: 'manager-lee',
        nextContactAt: null,
        nextAction: '보류 확인',
        consultationResult: '보류',
        memo: '대출 한도 확인 전까지 보류. 7월 재연락 예정.',
        createdAt: '2026-06-20T04:00:00.000Z',
        updatedAt: '2026-06-23T01:00:00.000Z'
    }),
    createLead({
        id: 'demo-candidate-1',
        name: '이도윤',
        mobile: '010-4101-2011',
        layer: 'candidate',
        status: '입지검토',
        grade: 'HOT',
        desiredRegion: '서울 마포구',
        budgetMin: 10000,
        budgetMax: 16000,
        interestedBrand: '미카도',
        source: '박람회',
        managerId: 'manager-lee',
        nextContactAt: '2026-06-25T03:30:00.000Z',
        nextAction: '물건 제안',
        consultationResult: '관심 높음',
        memo: '마포 오피스 상권 후보지 2곳 비교 중. 정보공개서 수신 확인 완료.',
        createdAt: '2026-06-19T03:30:00.000Z',
        updatedAt: '2026-06-24T05:00:00.000Z',
        disclosureState: 'confirmed',
        locationTargetId: 'demo-location-mapo-office'
    }),
    createLead({
        id: 'demo-candidate-2',
        name: '최하늘',
        mobile: '010-4101-2012',
        layer: 'candidate',
        status: '계약완료',
        grade: 'WARM',
        desiredRegion: '경기 성남시',
        budgetMin: 15000,
        budgetMax: 22000,
        interestedBrand: '미카도',
        source: '소개',
        managerId: 'manager-kim',
        nextContactAt: null,
        nextAction: '계약 조건 확인',
        consultationResult: '관심 높음',
        memo: '판교 계약 완료. 오픈 준비 프로젝트와 구비서류 확인용 샘플.',
        createdAt: '2026-06-06T03:00:00.000Z',
        updatedAt: '2026-06-24T04:30:00.000Z',
        disclosureState: 'eligible',
        locationTargetId: 'demo-operation-bundang'
    }),
    createLead({
        id: 'demo-candidate-3',
        name: '정유나',
        mobile: '010-4101-2013',
        layer: 'candidate',
        status: '계약예정',
        grade: 'HOT',
        desiredRegion: '서울 성동구',
        budgetMin: 18000,
        budgetMax: 26000,
        interestedBrand: '샘플카페',
        source: '네이버폼',
        managerId: 'manager-lee',
        nextContactAt: '2026-06-26T05:00:00.000Z',
        nextAction: '계약 조건 확인',
        consultationResult: '조건 조율',
        memo: '성수 코너 후보지 임대료 조정 후 계약 여부 결정 예정.',
        createdAt: '2026-06-12T02:00:00.000Z',
        updatedAt: '2026-06-24T06:00:00.000Z',
        disclosureState: 'eligible',
        locationTargetId: 'demo-location-seongsu-corner'
    }),
    createLead({
        id: 'demo-candidate-4',
        name: '한서준',
        mobile: '010-4101-2014',
        layer: 'candidate',
        status: '계약완료',
        grade: 'HOT',
        desiredRegion: '부산 해운대구',
        budgetMin: 12000,
        budgetMax: 18000,
        interestedBrand: '샘플카페',
        source: '광고',
        managerId: 'manager-lee',
        nextContactAt: null,
        nextAction: '미정',
        consultationResult: '관심 높음',
        memo: '센텀 오피스몰 계약 완료. 오픈물류와 교육 일정 확인 필요.',
        createdAt: '2026-06-04T02:20:00.000Z',
        updatedAt: '2026-06-24T02:40:00.000Z',
        disclosureState: 'eligible',
        locationTargetId: 'demo-operation-busan'
    }),
    createLead({
        id: 'demo-candidate-5',
        name: '강태오',
        mobile: '010-4101-2015',
        layer: 'candidate',
        status: '입지검토',
        grade: 'WARM',
        desiredRegion: '경기 수원시',
        budgetMin: 9000,
        budgetMax: 14000,
        interestedBrand: '미카도',
        source: '명함DB',
        managerId: 'manager-kim',
        nextContactAt: '2026-06-28T04:00:00.000Z',
        nextAction: '물건 제안',
        consultationResult: '연락 성공',
        memo: '수원역 후보지 권리금 조정 가능성 확인 후 제안 예정.',
        createdAt: '2026-06-15T07:00:00.000Z',
        updatedAt: '2026-06-23T09:20:00.000Z',
        disclosureState: 'confirmed',
        locationTargetId: 'demo-location-suwon-station'
    }),
    createLead({
        id: 'demo-candidate-6',
        name: '노아린',
        mobile: '010-4101-2016',
        layer: 'candidate',
        status: '계약완료',
        grade: 'WARM',
        desiredRegion: '제주 제주시',
        budgetMin: 8000,
        budgetMax: 12000,
        interestedBrand: '샘플치킨',
        source: '소개',
        managerId: 'manager-kim',
        nextContactAt: null,
        nextAction: '미정',
        consultationResult: '관심 높음',
        memo: '제주점 기존 계약 데이터 샘플. 운영 이관 상태 확인용.',
        createdAt: '2026-05-28T02:00:00.000Z',
        updatedAt: '2026-06-21T05:10:00.000Z',
        disclosureState: 'eligible',
        locationTargetId: 'demo-operation-jeju'
    }),
    createLead({
        id: 'demo-candidate-7',
        name: '배수민',
        mobile: '010-4101-2017',
        layer: 'candidate',
        status: '입지검토',
        grade: 'WARM',
        desiredRegion: '대구 중구',
        budgetMin: 7000,
        budgetMax: 10000,
        interestedBrand: '미카도',
        source: '가맹 희망자 등록',
        managerId: 'manager-kim',
        nextContactAt: '2026-06-29T02:00:00.000Z',
        nextAction: '방문 상담',
        consultationResult: '조건 조율',
        memo: '동성로 후보지 현장 동행 예정. 예상 매출 보수적으로 검토.',
        createdAt: '2026-06-13T01:20:00.000Z',
        updatedAt: '2026-06-22T02:20:00.000Z',
        disclosureState: 'none',
        locationTargetId: 'demo-location-daegu-dongseong'
    }),
    createLead({
        id: 'demo-candidate-8',
        name: '송지아',
        mobile: '010-4101-2018',
        layer: 'candidate',
        status: '가맹검토',
        grade: 'HOT',
        desiredRegion: '서울 강남구',
        budgetMin: 16000,
        budgetMax: 25000,
        interestedBrand: '미카도',
        source: '프랜차이즈 매칭 요청',
        managerId: 'manager-kim',
        nextContactAt: '2026-06-25T08:00:00.000Z',
        nextAction: '브랜드 제안',
        consultationResult: '연락 성공',
        memo: '브랜드별 예상 창업비 비교 요청. 강남역 후보지 관심 높음.',
        createdAt: '2026-06-24T00:40:00.000Z',
        updatedAt: '2026-06-24T06:40:00.000Z',
        disclosureState: 'none',
        locationTargetId: 'demo-location-gangnam-station'
    })
];

export function selectDemoContractLeads(role: DemoRole): readonly FranchiseLead[] {
    const contractLeads = DEMO_SAMPLE_LEADS.filter(lead => lead.status === '계약완료');
    if (role === 'admin') return contractLeads;
    if (role === 'manager') return contractLeads.filter(lead => lead.managerId === 'manager-kim');
    const sharedContract = contractLeads[0];
    return sharedContract ? [{
        ...sharedContract,
        id: 'demo-partner-contract-shared',
        managerId: 'partner-kim',
        desiredRegion: '경기 고양시',
        memo: '협력업체에 공유된 일산점 계약 완료 샘플입니다.',
        locationLinks: [{
            id: 'demo-partner-contract-shared-link',
            targetId: 'demo-operation-ilsan',
            targetType: 'franchise_location',
            status: '검토 예정',
            memo: '협력업체 공유 후보지',
            createdAt: sharedContract.updatedAt || '2026-06-24T04:30:00.000Z'
        }]
    }] : [];
}

type DemoLeadSeed = {
    readonly id: string;
    readonly name: string;
    readonly mobile: string;
    readonly layer: 'raw_intake' | 'candidate';
    readonly status: FranchiseLeadStatus;
    readonly grade: string;
    readonly desiredRegion: string;
    readonly budgetMin: number;
    readonly budgetMax: number;
    readonly interestedBrand: string;
    readonly source: string;
    readonly managerId: string;
    readonly nextContactAt: string | null;
    readonly nextAction: NonNullable<FranchiseLead['nextAction']>;
    readonly consultationResult: NonNullable<FranchiseLead['consultationResult']>;
    readonly memo: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly disclosureState?: 'none' | 'confirmed' | 'eligible';
    readonly locationTargetId?: string;
};

function createLead(seed: DemoLeadSeed): FranchiseLead {
    const disclosureState = seed.disclosureState || 'none';
    return {
        id: seed.id,
        companyId: 'demo-company',
        managerId: seed.managerId,
        name: seed.name,
        mobile: seed.mobile,
        mobileNormalized: seed.mobile.replace(/\D/g, ''),
        source: seed.source,
        status: seed.status,
        grade: seed.grade,
        leadStage: seed.layer,
        desiredRegion: seed.desiredRegion,
        budgetMin: seed.budgetMin * 10000,
        budgetMax: seed.budgetMax * 10000,
        interestedBrand: seed.interestedBrand,
        memo: seed.memo,
        nextContactAt: seed.nextContactAt,
        lastContactedAt: null,
        nextAction: seed.nextAction,
        consultationResult: seed.consultationResult,
        budgetFit: '적합',
        regionFit: '적합',
        brandFit: '보통',
        createdAt: seed.createdAt,
        updatedAt: seed.updatedAt,
        locationLinks: seed.locationTargetId ? [{
            id: `${seed.id}-link`,
            targetId: seed.locationTargetId,
            targetType: 'franchise_location',
            status: '검토 예정',
            memo: '데모 연결 후보지',
            createdAt: seed.updatedAt
        }] : [],
        disclosureSummary: buildDisclosure(disclosureState)
    };
}

function buildDisclosure(state: 'none' | 'confirmed' | 'eligible') {
    if (state === 'none') return undefined;
    return {
        state,
        label: state === 'eligible' ? '계약 가능' : '수신 확인 · D-10',
        latestDeliveryId: 'demo-delivery',
        latestSentAt: '2026-06-09T03:00:00.000Z',
        latestDocumentTitle: '미카도 정보공개서',
        latestDocumentVersion: '2026',
        latestSendStatus: 'sent',
        recipientEmail: 'sample@example.com',
        openedAt: state === 'confirmed' ? '2026-06-09T06:00:00.000Z' : null,
        confirmedAt: state === 'confirmed' ? '2026-06-09T06:03:00.000Z' : null,
        contractEligibleAt: state === 'eligible' ? '2026-06-18T03:00:00.000Z' : '2026-06-23T03:00:00.000Z',
        remainingDays: state === 'eligible' ? 0 : 10,
        waitDays: 14
    } as const;
}
