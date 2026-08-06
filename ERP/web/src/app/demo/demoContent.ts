import type { DemoRole, DemoRoleCard, DemoScenario, DemoScreenGuide, DemoScreenId } from './demoTypes';

const DASHBOARD_KPI_TARGET_SELECTOR =
    '[data-demo-id="franchise-dashboard"] section[aria-label="가맹 운영 주요 건수"]';
const DASHBOARD_SCHEDULE_TARGET_SELECTOR =
    '[data-demo-id="franchise-dashboard"] section[aria-label="예정된 일정"]';
const DASHBOARD_NOTICES_TARGET_SELECTOR =
    '[data-demo-id="franchise-dashboard"] section[aria-label="공지사항"]';
const DASHBOARD_MEMO_TARGET_SELECTOR =
    '[data-demo-id="franchise-dashboard"] section[aria-label="간편 메모"]';

export const DEMO_ROLES = [
    {
        id: 'manager',
        title: '담당자 데모',
        badge: '추천',
        href: '/demo/manager',
        description: '대시보드, 모객 DB, 계약 완료, 물건지 지도, 가맹 운영 화면을 현재 제품 흐름과 같은 구조로 체험합니다.',
        highlights: ['구비서류/오픈 준비', '물건지 지도', '모객 DB 관리']
    },
    {
        id: 'admin',
        title: '본사 관리자 데모',
        badge: '본사 설정',
        href: '/demo/admin',
        description: '본사 관리자 관점에서 프랜차이즈 DB, 계약 완료 점주, 물건지 지도, 운영 현황을 확인합니다.',
        highlights: ['회사 전체 모객 DB', '계약 완료 관리', '물건지 지도']
    },
    {
        id: 'partner',
        title: '협력업체 데모',
        badge: '외부 협업',
        href: '/demo/partner',
        description: '협력업체 관점에서 공유 가능한 후보지, 물건지 지도, 운영 공유 범위를 확인합니다.',
        highlights: ['내 후보지 확인', '지도 공유 범위', '공유 업무 확인']
    }
] as const satisfies readonly DemoRoleCard[];

export const DEMO_SIMULATION_ACTIONS = [
    '샘플 후보지 연결',
    '샘플 후보지 반영',
    '샘플 후보지 확인',
    '샘플 지역 인사이트 보기',
    '샘플 출점 후보지 탭',
    '샘플 운영 매장 등록',
    '샘플 고객 등록',
    '샘플 상세 패널 열기',
    '샘플 반경분석 보기',
    '샘플 거리재기 보기',
    '샘플 면적재기 보기',
    '샘플 직접 반경 그리기'
] as const;

export const DEMO_SCENARIOS = {
    manager: {
        role: 'manager',
        title: '담당자 프랜차이즈 데모',
        subtitle: '모객 DB, 출점 후보지, 가맹 운영 화면을 실제 UI 구조로 체험합니다.',
        defaultScreen: 'leadDb',
        navItems: [
            { id: 'dashboard', label: '대시보드', description: '프랜차이즈 핵심 지표를 먼저 확인합니다.' },
            { id: 'leadDb', label: '모객 DB', description: '고객 상태와 다음 연락을 관리합니다.' },
            { id: 'contractOwners', label: '계약 완료', description: '계약 완료 점주의 오픈 준비와 구비서류를 확인합니다.' },
            { id: 'location', label: '출점 후보지', description: '희망지역과 후보지를 연결합니다.' },
            { id: 'locationMap', label: '물건지 지도', description: '가맹 운영점과 출점 후보지를 지도에서 같이 확인합니다.' },
            { id: 'operations', label: '가맹 운영', description: '운영 매장 상태를 확인합니다.' }
        ],
        metrics: [
            { label: '오늘 연락', value: '8건', helper: '지연 3건 포함' },
            { label: '가맹 희망자', value: '4건', helper: '검토/계약 단계' },
            { label: '계약 가능', value: '2건', helper: '14일 기준 충족' },
            { label: '매칭 필요', value: '11건', helper: '후보지 연결 전' }
        ],
        tourSteps: [
            { id: 'manager-1', screen: 'leadDb', targetId: 'lead-dashboard-kpis', targetSelector: '[data-demo-id="dashboard-kpis"]', title: '광고 유입 현황', description: '광고와 엑셀에서 들어온 고객 수와 상담 진행 현황을 먼저 확인합니다.' },
            { id: 'manager-2', screen: 'leadDb', targetId: 'lead-db-management-tab', targetSelector: '[aria-label="모객 DB 작업 영역"] button:nth-of-type(2)', title: '개별 고객 관리', description: 'DB 관리로 이동해 고객별 신청 정보와 담당자 후속 업무를 확인합니다.' },
            { id: 'manager-3', screen: 'leadDb', targetId: 'lead-detail-activity', targetSelector: '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 상담 이력"]', title: '상담 이력 기록', description: '전화, 부재, 메모 이력을 남겨 다음 담당자가 고객 상황을 바로 이어받습니다.' },
            { id: 'manager-4', screen: 'leadDb', targetId: 'lead-db-promote-action', targetSelector: '[class*="leadTable"] [class*="rowActions"]:has([aria-label$="가맹 희망자 승격"])', title: '가맹 희망자로 승격', description: '상담 가능성이 확인된 1차 유입 고객을 가맹 희망자로 전환합니다.' },
            { id: 'manager-5', screen: 'leadDb', targetId: 'lead-db-candidate-tab', targetSelector: '[class*="leadLayerTabs"] button:nth-of-type(2)', title: '후속 업무 시작', description: '승격된 고객은 정보공개서와 후보지 연결, 계약 준비를 이어서 관리합니다.' },
            { id: 'manager-6', screen: 'location', targetId: 'location-master', targetSelector: '[data-demo-id="location-master"] tbody tr:first-child', title: '출점 후보지 연결', description: '희망지역에 맞는 후보지 조건과 임대 정보를 확인해 고객 상담에 연결합니다.' },
            { id: 'manager-7', screen: 'leadDb', targetId: 'lead-detail-location-link', targetSelector: '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 후보지 연결"]', title: '고객과 후보지 연결', description: '가맹 희망자 상세에서 검토한 출점 후보지를 연결해 고객 상담과 입지 검토를 한 흐름으로 관리합니다.' },
            { id: 'manager-8', screen: 'contractOwners', targetId: 'contract-owner-list', targetSelector: '[data-demo-id="contract-owner-list"]', title: '계약 이후 오픈 준비', description: '계약 완료 고객의 구비서류와 오픈 준비 일정을 한 흐름으로 확인합니다.' },
            { id: 'manager-9', screen: 'operations', targetId: 'operations-list', targetSelector: '[data-demo-id="operations-panel"] [aria-label="가맹 운영 보기"] button:nth-of-type(2)', title: '가맹 운영으로 전환', description: '오픈한 가맹점의 상태와 후속 일정을 본사 운영 화면에서 계속 관리합니다.' }
        ]
    },
    admin: {
        role: 'admin',
        title: '본사 관리자 데모',
        subtitle: '본사 관리자 기준으로 프랜차이즈 핵심 화면을 샘플 데이터로 확인합니다.',
        defaultScreen: 'leadDb',
        navItems: [
            { id: 'dashboard', label: '대시보드', description: '회사 전체 프랜차이즈 지표를 확인합니다.' },
            { id: 'leadDb', label: '모객 DB', description: '회사 전체 모객 DB를 확인합니다.' },
            { id: 'contractOwners', label: '계약 완료', description: '계약 완료 점주의 오픈 준비와 구비서류를 확인합니다.' },
            { id: 'location', label: '출점 후보지', description: '회사 후보지와 연결 상태를 확인합니다.' },
            { id: 'locationMap', label: '물건지 지도', description: '회사 물건지를 지도에서 확인합니다.' },
            { id: 'operations', label: '가맹 운영', description: '운영 매장 상태를 확인합니다.' }
        ],
        metrics: [
            { label: '전체 모객 DB', value: '18건', helper: '회사 전체 기준' },
            { label: '후보지', value: '9건', helper: '검토/오픈준비' },
            { label: '운영 매장', value: '12곳', helper: '직영점/가맹점' },
            { label: '매칭 필요', value: '6건', helper: '후보지 연결 전' }
        ],
        tourSteps: [
            { id: 'admin-1', screen: 'leadDb', targetId: 'lead-dashboard-kpis', targetSelector: '[data-demo-id="dashboard-kpis"]', title: '회사 모객 현황', description: '회사 전체 광고 유입과 상담 진행, 계약 전환율을 먼저 확인합니다.' },
            { id: 'admin-2', screen: 'leadDb', targetId: 'lead-db-management-tab', targetSelector: '[aria-label="모객 DB 작업 영역"] button:nth-of-type(2)', title: '담당자별 고객 관리', description: 'DB 관리에서 고객별 신청 정보와 담당자 후속 업무를 확인합니다.' },
            { id: 'admin-3', screen: 'leadDb', targetId: 'lead-detail-activity', targetSelector: '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 상담 이력"]', title: '상담 품질 확인', description: '전화, 부재, 메모 이력을 확인해 고객 대응이 끊기지 않게 관리합니다.' },
            { id: 'admin-4', screen: 'leadDb', targetId: 'lead-db-promote-action', targetSelector: '[class*="leadTable"] [class*="rowActions"]:has([aria-label$="가맹 희망자 승격"])', title: '가맹 희망자로 승격', description: '상담 가능성이 확인된 1차 유입 고객을 가맹 희망자로 전환합니다.' },
            { id: 'admin-5', screen: 'leadDb', targetId: 'lead-db-candidate-tab', targetSelector: '[class*="leadLayerTabs"] button:nth-of-type(2)', title: '후속 업무 관리', description: '정보공개서, 후보지 연결, 계약 준비 현황을 회사 기준으로 이어서 봅니다.' },
            { id: 'admin-6', screen: 'location', targetId: 'location-master', targetSelector: '[data-demo-id="location-master"] tbody tr:first-child', title: '후보지 검토', description: '희망지역과 임대 조건에 맞는 출점 후보지를 확인합니다.' },
            { id: 'admin-7', screen: 'leadDb', targetId: 'lead-detail-location-link', targetSelector: '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 후보지 연결"]', title: '고객과 후보지 연결', description: '가맹 희망자 상세에서 검토한 후보지를 연결해 상담과 입지 검토 현황을 함께 확인합니다.' },
            { id: 'admin-8', screen: 'contractOwners', targetId: 'contract-owner-list', targetSelector: '[data-demo-id="contract-owner-list"]', title: '계약 이후 준비', description: '계약 완료 고객의 구비서류와 오픈 준비 진행률을 확인합니다.' },
            { id: 'admin-9', screen: 'operations', targetId: 'operations-list', targetSelector: '[data-demo-id="operations-panel"] [aria-label="가맹 운영 보기"] button:nth-of-type(2)', title: '운영점 관리', description: '오픈한 가맹점의 상태와 일정, 운영 리스크를 계속 관리합니다.' }
        ]
    },
    partner: {
        role: 'partner',
        title: '협력업체 프랜차이즈 데모',
        subtitle: '협력업체에 공유된 후보지와 물건지, 운영 현황만 확인합니다.',
        defaultScreen: 'dashboard',
        navItems: [
            { id: 'dashboard', label: '대시보드', description: '협력업체 공유 범위의 프랜차이즈 지표를 봅니다.' },
            { id: 'contractOwners', label: '계약 완료', description: '공유 가능한 계약 완료 체크리스트를 봅니다.' },
            { id: 'location', label: '출점 후보지', description: '본사와 공유되는 출점 후보지를 봅니다.' },
            { id: 'locationMap', label: '물건지 지도', description: '공유 가능한 물건지를 지도에서 봅니다.' },
            { id: 'operations', label: '가맹 운영', description: '공유 가능한 운영 상태만 봅니다.' }
        ],
        metrics: [
            { label: '내 후보지', value: '4건', helper: '본사 공유' },
            { label: '본사 검토중', value: '2건', helper: '후보지 확인' },
            { label: '운영 공유', value: '1건', helper: '상태 확인' },
            { label: '숨김 처리', value: '안전', helper: '타 협력업체 건 제외' }
        ],
        tourSteps: [
            { id: 'partner-1', targetId: 'dashboard-home-kpis', targetSelector: DASHBOARD_KPI_TARGET_SELECTOR, title: '공유 범위 핵심 숫자', description: '협력업체는 본인에게 공유된 프랜차이즈 흐름만 샘플로 확인합니다.' },
            { id: 'partner-2', targetId: 'dashboard-home-schedule', targetSelector: DASHBOARD_SCHEDULE_TARGET_SELECTOR, title: '공유 일정', description: '본사와 공유된 현장 일정과 후속 업무만 확인합니다.' },
            { id: 'partner-3', targetId: 'dashboard-guide', title: '사용 설명서', description: '오른쪽 패널에서 무엇을 먼저 확인해야 하는지 바로 볼 수 있습니다.' },
            { id: 'partner-4', targetId: 'nav-locationMap', title: '물건지 지도', description: '지도에서는 본인이 작성했거나 본사가 공유한 물건지만 확인합니다.' }
        ]
    }
} as const satisfies Record<DemoRole, DemoScenario>;

export const DEMO_SCREEN_GUIDES: Record<DemoScreenId, DemoScreenGuide> = {
    dashboard: {
        badge: '가이드 1',
        title: '메인 대시보드는 오늘 볼 일을 먼저 보여줍니다.',
        description: '샘플 데이터로 작동하며 실제 저장, 발송, 삭제는 일어나지 않습니다.',
        steps: [
            { targetId: 'dashboard-home-kpis', targetSelector: DASHBOARD_KPI_TARGET_SELECTOR, title: 'KPI 확인', description: '모객 DB, 계약 가능, 출점 후보지, 연결 필요 건수를 먼저 확인합니다.' },
            { targetId: 'dashboard-home-schedule', targetSelector: DASHBOARD_SCHEDULE_TARGET_SELECTOR, title: '일정 확인', description: '오늘 확인할 현장 방문, 오픈 준비 점검, 수령 확인 콜을 먼저 봅니다.' },
            { targetId: 'dashboard-home-notices', targetSelector: DASHBOARD_NOTICES_TARGET_SELECTOR, title: '공지사항 확인', description: '팀 공지와 전체 안내를 확인하고 필요한 안내는 바로 열어봅니다.' },
            {
                targetId: 'dashboard-home-memo',
                targetSelector: DASHBOARD_MEMO_TARGET_SELECTOR,
                emphasisTargetIds: ['nav-leadDb'],
                title: '간편 메모',
                description: '오늘 처리할 메모를 남깁니다. 데모에서는 실제 저장되지 않습니다.'
            }
        ],
        actions: [
            { label: '모객 DB로 이동', screen: 'leadDb' },
            { label: '계약 완료 보기', screen: 'contractOwners' }
        ]
    },
    leadDb: {
        badge: '가이드 2',
        title: '모객 DB는 1차 유입과 가맹 희망자를 분리해서 봅니다.',
        description: '1차 유입 DB에서 상담 가능 고객을 선별하고, 가맹 희망자로 승격해 관리하는 흐름입니다.',
        steps: [
            {
                targetId: 'lead-dashboard-kpis',
                targetSelector: '[data-demo-id="dashboard-kpis"]',
                title: '핵심 현황',
                description: '1차 유입 DB, 가맹 희망자, 상담 진행, 계약 전환율을 한눈에 확인합니다.'
            },
            {
                targetId: 'lead-dashboard-pipeline',
                targetSelector: '[data-demo-id="dashboard-pipeline"]',
                title: '모객 파이프라인',
                description: '문의접수부터 계약완료까지 단계별 인원과 병목 구간을 확인합니다.'
            },
            {
                targetId: 'lead-db-management-tab',
                targetSelector: '[aria-label="모객 DB 작업 영역"] button:nth-of-type(2)',
                title: 'DB 관리로 이동',
                description: '개별 신청자를 확인하고 상담을 진행할 때 DB 관리 탭으로 이동합니다.'
            },
            {
                targetId: 'lead-detail-activity',
                targetSelector: '[role="dialog"][aria-labelledby="franchise-lead-detail-title"] section[aria-label="가맹 희망자 상담 이력"]',
                title: '상담 이력 관리',
                description: '전화·메모·부재 등의 상담 내용을 남기고 기존 이력을 수정하거나 삭제합니다.'
            },
            {
                targetId: 'lead-db-promote-action',
                targetSelector: '[class*="leadTable"] [class*="rowActions"]:has([aria-label$="가맹 희망자 승격"])',
                title: '승격 처리',
                description: '첫 행 오른쪽의 승격 버튼을 누르면 상담 가능성이 확인된 1차 유입 DB를 가맹 희망자 단계로 이동합니다.'
            },
            {
                targetId: 'lead-db-candidate-tab',
                targetSelector: '[class*="leadLayerTabs"] button:nth-of-type(2)',
                title: '가맹 희망자 탭',
                description: '승격된 고객은 가맹 희망자 탭에서 후보지 연결, 정보공개서, 계약 전환을 이어갑니다.'
            }
        ],
        actions: [
            { label: '계약 완료 보기', screen: 'contractOwners' },
            { label: '출점 후보지 보기', screen: 'location' }
        ]
    },
    contractOwners: {
        badge: '가이드 3',
        title: '계약 완료 상세는 오픈 준비부터 확인합니다.',
        description: '실제 상세 패널은 오픈 준비, 구비서류, 점주 문서함, 가맹점 정보 순서로 이어집니다.',
        steps: [
            { targetId: 'contract-owner-toolbar', title: '계약 완료 필터', description: '기간과 검색어로 계약 완료 점주 목록을 좁혀 확인합니다.' },
            { targetId: 'contract-owner-tabs', title: '계약 업무 탭', description: '모객 DB에서 계약 완료 탭으로 넘어와 완료 점주의 후속 업무를 봅니다.' },
            { targetId: 'contract-owner-list', targetSelector: '[data-demo-id="contract-owner-list"] button[class*="openButton"]', title: '구비서류 열기', description: '구비서류 열기를 누르면 샘플 상세와 누락 서류 흐름을 확인합니다.' }
        ],
        actions: [
            { label: '물건지 지도 보기', screen: 'locationMap' },
            { label: '가맹 운영 보기', screen: 'operations' }
        ]
    },
    location: {
        badge: '가이드 4',
        title: '출점 후보지는 운영 전 원천 후보지를 관리합니다.',
        description: '가맹점으로 전환하기 전 후보지 조건을 관리하고 희망지역 수요와 외부 상가 원본을 함께 비교합니다.',
        steps: [
            { targetId: 'location-workspace-tabs', targetSelector: '[data-demo-id="location-workspace-tabs"] [aria-label="출점 후보지 작업 영역"]', title: '작업 영역 전환', description: '본사가 관리하는 출점 후보지와 외부에서 수집한 상가 원본을 분리해 확인합니다.' },
            { targetId: 'location-view-tabs', targetSelector: '[data-demo-id="location-view-tabs"] [aria-label="출점 후보지 보기 방식"]', title: '목록과 지역 인사이트', description: '후보지를 직접 관리하거나 지역별 고객 수요와 연결 필요 건수를 비교합니다.' },
            { targetId: 'location-master', targetSelector: '[data-demo-id="location-master"] [aria-label="후보지 목록 등록 전환"] button:nth-of-type(2)', title: '후보지 등록', description: '등록 버튼을 누르면 주소, 지역, 임대 조건과 담당자를 실제 운영 화면과 같은 양식으로 입력합니다.' },
            { targetId: 'location-master', targetSelector: '[data-demo-id="location-master"] tbody tr:first-child [aria-label$="후보지 수정"]', title: '개별 후보지 열기', description: '목록의 수정 버튼을 눌러 현장 조건과 임대 정보, 담당자, 첨부 자료를 확인합니다.' }
        ],
        actions: [
            { label: '물건지 지도 보기', screen: 'locationMap' },
            { label: '모객 DB로 이동', screen: 'leadDb' }
        ]
    },
    locationMap: {
        badge: '가이드 5',
        title: '물건지 지도는 운영점과 후보지를 한 지도에서 봅니다.',
        description: '지도에서 운영점과 출점 후보지의 위치, 반경, 거리와 주변 조건을 함께 확인합니다.',
        steps: [
            { targetId: 'location-map-page', targetSelector: '[data-demo-id="location-map-page"] [aria-label="물건지 지도 필터"]', title: '대상 전환', description: '전체, 가맹 운영점, 출점 후보지를 탭으로 나눠 현재 보고 싶은 물건지만 봅니다.' },
            { targetId: 'location-map-page', targetSelector: '[data-demo-id="location-map-page"] [aria-label="샘플 물건지 지도"]', title: '마커 선택', description: '지도 마커를 누르면 우측 상세 카드와 반경분석 기준이 함께 바뀝니다.' },
            { targetId: 'location-map-page', targetSelector: '[data-demo-id="location-map-page"] [aria-label="지도 분석 도구"]', title: '지도 분석', description: '우측 패널에서 반경분석, 거리재기, 면적재기 흐름을 같은 용어로 확인합니다.' }
        ],
        actions: [
            { label: '출점 후보지 보기', screen: 'location' },
            { label: '가맹 운영 보기', screen: 'operations' }
        ]
    },
    operations: {
        badge: '가이드 6',
        title: '가맹 운영은 오픈 이후 상태와 운영 리스크를 봅니다.',
        description: '운영중, 오픈준비, 휴점, 폐점 상태를 기반으로 본사 운영 관리 흐름을 확인합니다.',
        steps: [
            { targetId: 'operations-summary', targetSelector: '[data-demo-id="operations-panel"] [class*="marketSummaryCards"]', title: '운영 상태 확인', description: '운영중과 오픈준비 매장을 분리해 오늘 관리할 점포를 먼저 파악합니다.' },
            { targetId: 'operations-list', targetSelector: '[data-demo-id="operations-panel"] [aria-label="가맹 운영 보기"] button:nth-of-type(2)', title: '가맹점 목록 열기', description: '가맹점 목록 탭을 누르면 매장별 상태, 주소, 오픈일과 수정 기능을 확인할 수 있습니다.' },
            { targetId: 'nav-locationMap', title: '지도 연결', description: '물건지 지도와 함께 보면 지역별 밀집도와 주변 후보지를 이어서 확인할 수 있습니다.' }
        ],
        actions: [
            { label: '물건지 지도 보기', screen: 'locationMap' },
            { label: '대시보드로 이동', screen: 'dashboard' }
        ]
    }
};
