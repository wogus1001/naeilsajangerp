import type { DemoRole, DemoStory, DemoStoryId } from './demoTypes';

export const DEMO_STORY_ORDER = [
    'sales',
    'siteDevelopment',
    'openingOperations',
    'headOffice'
] as const satisfies readonly DemoStoryId[];

export const DEMO_STORIES = {
    sales: {
        id: 'sales',
        roleLabel: '가맹 영업 담당자',
        title: '광고 문의를 놓치지 않고 상담 기회로 전환하기',
        description: '신규 문의가 들어온 순간부터 담당자 상담, 가맹 희망자 승격, 정보공개서 발송 준비까지 실제 모객 업무를 따라갑니다.',
        duration: '약 5분',
        outcome: '광고 유입부터 상담, 상담 가능 고객 선별, 정보공개서 발송 준비까지 한 화면에서 이어지는 흐름을 확인했습니다.',
        features: ['유입·상태별 모객 현황', '고객별 상담 이력', '다음 연락과 담당자 업무', '가맹 희망자 승격', '정보공개서·14일 기준'],
        roles: ['manager', 'admin'],
        steps: [
            { id: 'sales-1', screen: 'leadDb', targetId: 'lead-dashboard-kpis', targetSelector: '[data-demo-id="dashboard-kpis"]', title: '오늘 들어온 문의와 진행 상태 확인', description: '1차 유입 DB, 가맹 희망자, 상담 진행, 계약 전환율을 함께 보고 영업 현황을 빠르게 파악합니다.' },
            { id: 'sales-2', screen: 'leadDb', targetId: 'lead-dashboard-pipeline', targetSelector: '[data-demo-id="dashboard-pipeline"]', title: '상담이 막힌 단계 찾기', description: '문의접수부터 계약완료까지 단계별 건수를 비교해 고객이 오래 머무는 구간을 찾습니다.' },
            { id: 'sales-3', screen: 'leadDb', targetId: 'lead-db-management-tab', targetSelector: '[aria-label="모객 DB 작업 영역"] button:nth-of-type(2)', title: '고객별 후속 업무로 이동', description: 'DB 관리에서 연락처, 담당자, 유입경로, 다음 연락일을 고객별로 확인합니다.' },
            { id: 'sales-4', screen: 'leadDb', targetId: 'lead-detail-activity', targetSelector: '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 상담 이력"]', title: '상담 이력 남기기', description: '전화, 부재, 메모를 시간순으로 남겨 다음 담당자도 고객 상황을 바로 이어받습니다.' },
            { id: 'sales-5', screen: 'leadDb', targetId: 'lead-detail-workflow', targetSelector: '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 업무 관리"]', title: '다음 행동과 상담 결과 정리', description: '예산 재확인, 지역 검토 같은 다음 행동과 상담 결과를 기록해 후속 업무를 명확하게 만듭니다.' },
            { id: 'sales-6', screen: 'leadDb', targetId: 'lead-db-promote-action', targetSelector: '[class*="leadTable"] [class*="rowActions"]:has([aria-label$="가맹 희망자 승격"])', title: '상담 가능 고객 승격', description: '가맹 의사가 확인된 고객만 가맹 희망자로 승격해 일반 문의와 본격 상담 대상을 분리합니다.' },
            { id: 'sales-7', screen: 'leadDb', targetId: 'lead-db-candidate-tab', targetSelector: '[class*="leadLayerTabs"] button:nth-of-type(2)', title: '가맹 희망자 후속 관리 시작', description: '승격된 고객은 희망지역, 정보공개서, 후보지, 계약 준비를 이어서 관리합니다.' },
            { id: 'sales-8', screen: 'leadDb', targetId: 'lead-detail-disclosure', targetSelector: '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 정보공개서"]', title: '정보공개서 발송과 법정기한 확인', description: '발송 문서와 수신 정보를 확인하고 발송 기록을 남깁니다. 표준 계약 흐름은 기록일 기준 14일이 지나기 전 계약 전환을 서버에서 막으며, 이메일 열람 표시는 법적 수령 확인을 대신하지 않습니다.' }
        ]
    },
    siteDevelopment: {
        id: 'siteDevelopment',
        roleLabel: '출점 개발 담당자',
        title: '고객 희망지역과 실제 출점 후보지를 연결하기',
        description: '가맹 희망자의 지역 조건을 확인하고 후보지 검토 기록과 지도 분석을 이용해 상담 가능한 점포를 좁힙니다.',
        duration: '약 6분',
        outcome: '가맹 희망자의 조건을 후보지 정보와 물건 기록, 출점 리포트, 지도 분석에 연결하고 실제 후보지 연결까지 확인했습니다.',
        features: ['희망지역·예산 조건', '후보지 임대 조건', '물건 요청·처리 기록', '출점 검토 리포트', '후보지 연결·지도 분석'],
        roles: ['manager', 'admin'],
        steps: [
            { id: 'site-1', screen: 'leadDb', targetId: 'lead-db-candidate-tab', targetSelector: '[class*="leadLayerTabs"] button:nth-of-type(2)', title: '출점 상담 대상 확인', description: '가맹 희망자 탭에서 희망지역, 예산, 관심 브랜드가 입력된 고객을 먼저 확인합니다.' },
            { id: 'site-2', screen: 'leadDb', targetId: 'lead-db-candidate-table', targetSelector: '[class*="leadTable"]', title: '고객 조건을 후보지 검토 기준으로 정리', description: '희망지역, 예산, 관심 브랜드와 담당자를 함께 확인해 어떤 후보지를 먼저 제안할지 기준을 세웁니다.' },
            { id: 'site-3', screen: 'location', targetId: 'location-workspace-tabs', targetSelector: '[data-demo-id="location-workspace-tabs"] [aria-label="출점 후보지 작업 영역"]', title: '후보지 업무 범위 선택', description: '직접 관리하는 출점 후보지와 외부 상가 수집을 구분해 원천 정보가 운영 기록과 섞이지 않게 관리합니다.' },
            { id: 'site-4', screen: 'location', targetId: 'location-master', targetSelector: '[data-demo-id="location-master"] tbody tr:first-child [aria-label$="후보지 수정"]', title: '점포 조건 상세 검토', description: '주소, 전용면적, 보증금, 권리금, 월세와 시설 조건을 열어 고객 예산에 맞는지 검토합니다.' },
            { id: 'site-5', screen: 'location', targetId: 'location-message-panel', targetSelector: '[role="dialog"][aria-label="물건 기록"]', title: '물건 요청과 확인 기록', description: '본사는 물건 검토 요청과 확인 정보를 기록하고, 담당자는 내용을 확인해 처리합니다.' },
            { id: 'site-6', screen: 'location', targetId: 'location-report-action', targetSelector: '[data-demo-id="location-master"] tbody tr:first-child [class*="locationTableActions"] button:nth-of-type(2)', title: '출점 검토 리포트 만들기', description: '수익분석, 상권 메모, 임대 조건을 리포트로 정리해 후보지 검토 근거와 버전 이력을 남깁니다.' },
            { id: 'site-7', screen: 'locationMap', targetId: 'location-map-filter', targetSelector: '[data-demo-id="location-map-page"] [aria-label="물건지 지도 필터"]', title: '지도에 표시할 대상 좁히기', description: '지역, 후보지 상태, 브랜드 기준으로 지도에 표시할 점포를 좁혀 비교 대상을 정리합니다.' },
            { id: 'site-8', screen: 'locationMap', targetId: 'location-map-canvas', targetSelector: '[data-demo-id="location-map-page"] [aria-label="물건지 지도"]', title: '후보지와 운영점을 함께 비교', description: '출점 후보지와 운영 가맹점을 실제 지도에서 확인해 상권 중복과 관리 동선을 검토합니다.' },
            { id: 'site-9', screen: 'locationMap', targetId: 'location-map-tools', targetSelector: '[data-demo-id="location-map-page"] [aria-label="지도 분석 도구"]', title: '반경·거리·면적 분석', description: '상권 반경, 경쟁점 거리, 후보지 면적을 직접 측정해 출점 검토 근거를 남깁니다.' },
            { id: 'site-10', screen: 'leadDb', targetId: 'lead-detail-location-link', targetSelector: '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 후보지 연결"]', title: '가맹 희망자와 후보지 연결', description: '검토를 마친 후보지를 가맹 희망자 상세에 연결해 상담 기록과 입지 검토 결과를 한 고객 흐름으로 남깁니다.' }
        ]
    },
    openingOperations: {
        id: 'openingOperations',
        roleLabel: '오픈 준비 담당자',
        title: '계약 완료 고객을 오픈 가능한 가맹점으로 준비하기',
        description: '계약 이후 필요한 서류, 인력, 일정, 점주 요청을 연결하고 오픈한 매장을 운영 관리로 넘깁니다.',
        duration: '약 5분',
        outcome: '계약 완료 이후 흩어지기 쉬운 서류·인력·일정·점주 업무를 하나의 오픈 준비 흐름으로 연결했습니다.',
        features: ['구비서류·법정기한', '매출 기반 인력 계획', '오픈 일정 관리', '점주 공지·제출 요청'],
        roles: ['manager', 'admin'],
        steps: [
            { id: 'opening-1', screen: 'contractOwners', targetId: 'contract-owner-toolbar', targetSelector: '[data-demo-id="contract-owner-toolbar"]', title: '계약 완료 고객 빠르게 찾기', description: '이름, 담당자, 진행 기간으로 오픈 준비를 확인할 고객을 좁혀 여러 계약 건을 빠르게 점검합니다.' },
            { id: 'opening-2', screen: 'contractOwners', targetId: 'contract-owner-tabs', targetSelector: '[data-demo-id="contract-owner-tabs"]', title: '계약 이후 업무로 전환', description: '모객 DB와 계약 완료 업무를 분리해 계약 전 고객과 오픈 준비 점주가 같은 목록에 섞이지 않게 관리합니다.' },
            { id: 'opening-3', screen: 'contractOwners', targetId: 'contract-owner-list', targetSelector: '[data-demo-id="contract-owner-list"]', title: '구비서류와 법정기한 확인', description: '정보공개서 발송 기록, 14일 법정기한, 필수 서류와 내부 보고 항목을 한 목록에서 점검합니다. 체크리스트는 회사의 법률 검토를 대신하지 않습니다.' },
            { id: 'opening-4', featurePath: '/dashboard/franchise-leads/labor-planning', targetId: 'labor-plan-input', targetSelector: 'section[aria-label="인력 계산 조건"]', title: '예상 매출로 필요 인력 계산', description: '매장, 예상 매출, 영업시간을 입력해 정규직과 파트타이머 구성, 예상 인건비를 계산합니다.' },
            { id: 'opening-5', featurePath: '/dashboard/franchise-leads/labor-planning', targetId: 'labor-plan-result-tab', targetSelector: 'nav[aria-label="인력 세팅 보기"] button:nth-of-type(2)', title: '인력 추천안 비교', description: '표준형과 절약형의 인원·인건비를 비교하고 채용과 근무표에 사용할 안을 선택합니다.' },
            { id: 'opening-6', featurePath: '/dashboard/franchise-operations/schedule', targetId: 'schedule-calendar', targetSelector: 'section[aria-label="월간 일정 달력"]', title: '오픈 준비 일정 정리', description: '교육, 공사, 장비 입고, 오픈 점검 일정을 달력에서 확인하고 담당자별 후속 업무를 배정합니다.' },
            { id: 'opening-7', featurePath: '/dashboard/franchise-operations/owner-portal', targetId: 'owner-portal-notices', targetSelector: 'section[aria-label="점주 공지 관리"]', title: '점주 안내와 제출 요청 관리', description: '오픈 전 공지와 체크리스트를 전달하고 점주가 제출한 매장 정보와 문의를 본사 업무로 연결합니다.' },
            { id: 'opening-8', screen: 'operations', targetId: 'operations-list', targetSelector: '[data-demo-id="operations-panel"] [aria-label="가맹 운영 보기"] button:nth-of-type(2)', title: '운영 가맹점으로 전환', description: '오픈 준비가 끝난 매장을 가맹점 목록으로 넘겨 상태, 일정, 운영 메모를 계속 관리합니다.' }
        ]
    },
    headOffice: {
        id: 'headOffice',
        roleLabel: '본부 관리자',
        title: '여러 가맹점의 운영 위험과 점주 업무를 한눈에 관리하기',
        description: '운영 현황에서 우선 점검 매장을 찾고 슈퍼바이징, 협력업체, 전자계약, 점주 홈페이지까지 본부 업무를 연결합니다.',
        duration: '약 6분',
        outcome: '운영점 점검부터 계약, 점주 계정 발급과 점주 홈페이지 업무까지 본부가 놓치기 쉬운 운영 흐름을 확인했습니다.',
        features: ['가맹 운영 현황', 'SV 방문·시정요청', '협력업체 계약·갱신', '전자계약 서명 상태', '점주 계정·홈페이지'],
        roles: ['manager', 'admin'],
        steps: [
            { id: 'hq-1', screen: 'dashboard', targetId: 'dashboard-home-kpis', targetSelector: '[data-demo-id="franchise-dashboard"] section[aria-label="가맹 운영 주요 건수"]', title: '본부 핵심 지표 확인', description: '모객 DB, 계약 가능, 출점 후보지, 연결 필요 건수를 보고 오늘 우선 확인할 업무를 정합니다.' },
            { id: 'hq-2', screen: 'operations', targetId: 'operations-list', targetSelector: '[data-demo-id="operations-panel"] [aria-label="가맹 운영 보기"] button:nth-of-type(2)', title: '운영 가맹점 상태 확인', description: '운영중, 오픈준비, 휴점 상태와 담당자 메모를 비교해 본부의 후속 관리 대상을 찾습니다.' },
            { id: 'hq-3', featurePath: '/dashboard/franchise-supervision', targetId: 'supervision-overview', targetSelector: 'section[aria-label="슈퍼바이징 운영 리포트"]', title: '슈퍼바이징 위험 확인', description: '방문율, 승인 대기, 지연 건수로 운영 품질이 떨어질 가능성이 있는 매장을 먼저 확인합니다.' },
            { id: 'hq-4', featurePath: '/dashboard/franchise-vendors', targetId: 'vendor-kpis', targetSelector: 'section[aria-label="업체 관리 핵심 현황"]', title: '협력업체와 갱신 위험 확인', description: '인테리어, 물류, 설비 업체의 계약 여부와 갱신 필요 건수를 함께 확인합니다.' },
            { id: 'hq-5', featurePath: '/contracts/vendor', targetId: 'vendor-contract-queue', targetSelector: 'section[aria-label="업체 계약 업무 큐"]', title: '업체 계약 우선 업무 처리', description: '검토 대기, 만료 예정, 갱신 필요 계약을 업무 순서대로 확인해 계약 공백을 줄입니다.' },
            { id: 'hq-6', featurePath: '/contracts/electronic', targetId: 'electronic-list', targetSelector: 'section[aria-label="전자계약 문서 목록"]', title: '서명 진행 상태 확인', description: '발송, 서명 대기, 완료, 취소 상태와 만료 시점을 확인해 미완료 계약을 후속 처리합니다.' },
            { id: 'hq-7', featurePath: '/dashboard/franchise-operations/owner-portal', targetId: 'owner-portal-account-tab', targetSelector: '[role="tablist"][aria-label="점주 소통 업무"] button:nth-of-type(7)', title: '점주 계정 설정으로 이동', description: '운영점별 점주 계정을 발급하고 관리하는 화면으로 이동합니다.' },
            { id: 'hq-8', featurePath: '/dashboard/franchise-operations/owner-portal', targetId: 'owner-portal-account-create', targetSelector: 'section[aria-label="점주 계정 관리"] [aria-label="신규 점주 계정 발급"]', title: '운영점 점주 계정 발급', description: '운영점을 선택하고 점주명과 연락처를 입력해 로그인 아이디와 임시 비밀번호를 발급합니다.' },
            { id: 'hq-9', featurePath: '/dashboard/franchise-operations/owner-portal', targetId: 'owner-portal-login-link', targetSelector: 'section[aria-label="점주 계정 관리"] [aria-label="회사별 점주 포털 로그인 링크"]', title: '점주 홈페이지 접속 안내', description: '회사 전용 로그인 링크와 발급된 계정 정보를 점주에게 전달하면 별도 설치 없이 점주 홈페이지를 사용할 수 있습니다.' },
            { id: 'hq-10', featurePath: '/owner/dashboard', targetId: 'owner-dashboard-summary', targetSelector: 'section[aria-label="점주 업무 요약"]', title: '점주 홈페이지 업무 확인', description: '점주는 미확인 공지, 남은 체크리스트, 처리 대기 요청을 확인하고 본사에 매장 정보와 시설 문의를 제출합니다.' }
        ]
    }
} as const satisfies Record<DemoStoryId, DemoStory>;

export function selectDemoStoriesForRole(role: DemoRole): readonly DemoStory[] {
    if (role === 'partner') return [];
    return DEMO_STORY_ORDER
        .map(storyId => DEMO_STORIES[storyId])
        .filter(story => story.roles.includes(role));
}
