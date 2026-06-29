import type { DemoRole, DemoRoleCard, DemoScenario, DemoScreenGuide, DemoScreenId } from './demoTypes';

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
        title: '관리자 데모',
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
        highlights: ['내 후보지 확인', '지도 공유 범위', '권한 격리']
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
        defaultScreen: 'dashboard',
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
            { label: '후보자', value: '4건', helper: '검토/계약 단계' },
            { label: '계약 가능', value: '2건', helper: '14일 기준 충족' },
            { label: '매칭 필요', value: '11건', helper: '후보지 연결 전' }
        ],
        tourSteps: [
            { id: 'manager-1', targetId: 'dashboard-kpis', title: '오늘의 핵심 숫자', description: '1차 유입, 가맹 희망자, 상담 진행, 전환율을 먼저 보고 오늘 점검할 흐름을 잡습니다.' },
            { id: 'manager-2', targetId: 'dashboard-pipeline', title: '상태별 병목 확인', description: '문의접수부터 계약완료까지 어느 단계에 고객이 몰려 있는지 보고 다음 액션을 정합니다.' },
            { id: 'manager-3', targetId: 'dashboard-source', title: '유입 경로 비교', description: 'Meta 광고, 랜딩페이지, 박람회, 소개 등 채널별 모객 볼륨을 비교합니다.' },
            { id: 'manager-4', targetId: 'dashboard-guide', title: '화면별 사용 가이드', description: '처음 보는 사용자도 각 화면에서 확인 순서와 다음 이동 화면을 바로 볼 수 있습니다.' },
            { id: 'manager-5', targetId: 'dashboard-home-notices', title: '공지사항 확인', description: '팀 공지와 전체 안내를 확인하고 필요한 안내는 바로 열어봅니다.' }
        ]
    },
    admin: {
        role: 'admin',
        title: '관리자 설정 데모',
        subtitle: '본사 관리자 기준으로 프랜차이즈 핵심 화면을 샘플 데이터로 확인합니다.',
        defaultScreen: 'dashboard',
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
            { id: 'admin-1', targetId: 'dashboard-kpis', title: '회사 전체 핵심 숫자', description: '관리자는 회사 기준의 모객, 상담, 계약 전환 흐름을 먼저 확인합니다.' },
            { id: 'admin-2', targetId: 'dashboard-pipeline', title: '파이프라인 점검', description: '단계별 병목을 보고 담당자나 캠페인 조정이 필요한 구간을 찾습니다.' },
            { id: 'admin-3', targetId: 'dashboard-source', title: '채널별 유입 확인', description: '광고와 소개 등 유입 채널별 볼륨을 비교해 운영 판단에 활용합니다.' },
            { id: 'admin-4', targetId: 'dashboard-guide', title: '사용 설명서', description: '오른쪽 패널에서 대시보드 확인 순서와 다음 이동 화면을 바로 볼 수 있습니다.' },
            { id: 'admin-5', targetId: 'dashboard-home-notices', title: '공지사항 확인', description: '회사 전체 안내와 팀 공지를 확인하고 필요한 공지는 바로 열어봅니다.' }
        ]
    },
    partner: {
        role: 'partner',
        title: '협력업체 프랜차이즈 데모',
        subtitle: '협력업체가 볼 수 있는 프랜차이즈 후보지/운영 공유 범위만 확인합니다.',
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
            { id: 'partner-1', targetId: 'dashboard-kpis', title: '공유 범위 핵심 숫자', description: '협력업체는 본인에게 공유된 프랜차이즈 흐름만 샘플로 확인합니다.' },
            { id: 'partner-2', targetId: 'dashboard-pipeline', title: '공유 파이프라인', description: '본사와 공유된 건의 단계 흐름만 확인하고 타 협력업체 건은 보이지 않습니다.' },
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
            { targetId: 'dashboard-home-kpis', title: 'KPI 확인', description: '모객 DB, 계약 가능, 출점 후보지, 연결 필요 건수를 먼저 확인합니다.' },
            { targetId: 'dashboard-home-schedule', title: '일정 확인', description: '오늘 확인할 현장 방문, 오픈 준비 점검, 수령 확인 콜을 먼저 봅니다.' },
            { targetId: 'dashboard-home-notices', title: '공지사항 확인', description: '팀 공지와 전체 안내를 확인하고 필요한 안내는 바로 열어봅니다.' },
            {
                targetId: 'dashboard-home-memo',
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
        title: '모객 DB는 유입과 후보자를 분리해서 봅니다.',
        description: '1차 유입 DB에서 상담 가능 고객을 선별하고, 가맹 희망자로 승격해 관리하는 흐름입니다.',
        steps: [
            {
                targetId: 'lead-db-filters',
                title: '필터 검색',
                description: '기간, 상태, 유입, 담당자, 검색어로 오늘 확인할 DB를 먼저 좁혀봅니다.'
            },
            {
                targetId: 'lead-db-raw-intake-tab',
                targetSelector: '[class*="leadLayerTabs"] button:nth-of-type(1)',
                title: '1차 유입 DB',
                description: 'Meta 광고, 엑셀 업로드 등 처음 들어온 원천 DB를 모아두고 상담 가능성을 먼저 봅니다.'
            },
            {
                targetId: 'lead-db-first-record',
                targetSelector: '[class*="leadTable"] tbody tr:first-child [class*="nameButton"]',
                title: '개별 DB 상세',
                description: '이름을 누르면 상세 드로어가 열리고 상담 메모, 희망지역, 다음 액션을 확인합니다.'
            },
            {
                targetId: 'lead-db-promote-action',
                targetSelector: '[data-demo-id="lead-db-drawer-primary-action"]',
                title: '승격 처리',
                description: '상담 가능성이 확인된 1차 유입 DB는 상세 드로어에서 가맹 희망자로 승격합니다.'
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
            { targetId: 'contract-owner-list', title: '구비서류 열기', description: '점주명이나 구비서류 열기를 누르면 샘플 상세와 누락 서류 흐름을 확인합니다.' }
        ],
        actions: [
            { label: '물건지 지도 보기', screen: 'locationMap' },
            { label: '가맹 운영 보기', screen: 'operations' }
        ]
    },
    location: {
        badge: '가이드 4',
        title: '출점 후보지는 운영 전 원천 후보지를 관리합니다.',
        description: '가맹점으로 전환하기 전 후보지 조건, 주소, 임대 정보, 담당자를 정리하는 화면입니다.',
        steps: [
            { targetId: 'location-tabs', title: '후보지 탭', description: '출점 후보지와 지역 인사이트 흐름을 같은 업무 축에서 전환합니다.' },
            { targetId: 'location-master', title: '후보지 등록', description: '카카오 주소 검색 기준으로 주소와 지역을 정리해 이후 지도/운영 화면과 연결합니다.' },
            { targetId: 'location-master', title: '개별 후보지 열기', description: '목록의 수정 버튼을 누르면 샘플 상세를 열고 조건, 임대 정보, 담당자를 확인합니다.' }
        ],
        actions: [
            { label: '물건지 지도 보기', screen: 'locationMap' },
            { label: '모객 DB로 이동', screen: 'leadDb' }
        ]
    },
    locationMap: {
        badge: '가이드 5',
        title: '물건지 지도는 운영점과 후보지를 한 지도에서 봅니다.',
        description: 'Kakao 지도 기반 화면의 구조를 샘플로 재현했습니다. 데모에서는 정적 좌표와 로컬 상태만 사용합니다.',
        steps: [
            { targetId: 'location-map-filters', title: '대상 전환', description: '전체, 가맹 운영점, 출점 후보지를 탭으로 나눠 현재 보고 싶은 물건지만 봅니다.' },
            { targetId: 'location-map-canvas', title: '마커 선택', description: '지도 마커를 누르면 우측 상세 카드와 반경분석 기준이 함께 바뀝니다.' },
            { targetId: 'location-map-panel', title: '지도 분석', description: '우측 패널에서 반경분석, 거리재기, 면적재기 흐름을 같은 용어로 확인합니다.' }
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
            { targetId: 'operations-summary', title: '운영상태 확인', description: '운영중과 오픈준비 매장을 분리해 오늘 관리할 점포를 먼저 파악합니다.' },
            { targetId: 'operations-list', title: '개별 매장 열기', description: '매장 수정 버튼을 누르면 샘플 상세를 열고 상태와 오픈일을 확인합니다.' },
            { targetId: 'operations-guide-link', title: '지도 연결', description: '물건지 지도와 함께 보면 지역별 밀집도와 주변 후보지를 이어서 확인할 수 있습니다.' }
        ],
        actions: [
            { label: '물건지 지도 보기', screen: 'locationMap' },
            { label: '대시보드로 이동', screen: 'dashboard' }
        ]
    }
};
