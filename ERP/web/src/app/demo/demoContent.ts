import type { DemoRole, DemoRoleCard, DemoScenario } from './demoTypes';

export const DEMO_ROLES = [
    {
        id: 'manager',
        title: '담당자 데모',
        badge: '추천',
        href: '/demo/manager',
        description: '대시보드, 모객 DB, 출점 후보지, 가맹 운영 화면을 실제 UI와 같은 구조로 체험합니다.',
        highlights: ['프랜차이즈 대시보드', '모객 DB 관리', '출점 후보지 매칭']
    },
    {
        id: 'admin',
        title: '관리자 데모',
        badge: '본사 설정',
        href: '/demo/admin',
        description: '본사 관리자 관점에서 프랜차이즈 DB와 후보지, 운영 현황을 확인합니다.',
        highlights: ['회사 전체 모객 DB', '후보지 현황', '운영 매장 현황']
    },
    {
        id: 'partner',
        title: '협력업체 데모',
        badge: '외부 협업',
        href: '/demo/partner',
        description: '협력업체 관점에서 볼 수 있는 출점 후보지와 운영 공유 범위를 확인합니다.',
        highlights: ['내 후보지 확인', '본사 공유 상태', '권한 격리']
    }
] as const satisfies readonly DemoRoleCard[];

export const DEMO_SIMULATION_ACTIONS = [
    '샘플 후보지 연결',
    '샘플 후보지 반영',
    '샘플 후보지 확인',
    '샘플 지역 인사이트 보기',
    '샘플 출점 후보지 탭',
    '샘플 새로고침',
    '샘플 운영 매장 등록',
    '샘플 고객 등록',
    '샘플 상세 패널 열기'
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
            { id: 'contractOwners', label: '계약 완료', description: '계약 완료 점주의 체크리스트를 확인합니다.' },
            { id: 'location', label: '출점 후보지', description: '희망지역과 후보지를 연결합니다.' },
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
            { id: 'manager-4', targetId: 'dashboard-guide', title: '오른쪽 사용 설명서', description: '처음 보는 사용자도 순서대로 확인할 수 있도록 대시보드 옆에 간단한 사용 방법을 고정했습니다.' },
            { id: 'manager-5', targetId: 'dashboard-tabs', title: '다음 작업으로 이동', description: 'DB 관리는 고객 목록, 계약 완료는 완료 점주의 체크리스트로 이어집니다.' }
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
            { id: 'contractOwners', label: '계약 완료', description: '계약 완료 점주의 체크리스트를 확인합니다.' },
            { id: 'location', label: '출점 후보지', description: '회사 후보지와 연결 상태를 확인합니다.' },
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
            { id: 'admin-5', targetId: 'dashboard-tabs', title: '관리 탭 이동', description: 'DB 관리와 계약 완료 탭으로 이어서 상세 업무를 확인합니다.' }
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
            { id: 'partner-4', targetId: 'nav-location', title: '출점 후보지', description: '후보지 메뉴에서는 본인이 작성했거나 본사가 공유한 건만 확인합니다.' }
        ]
    }
} as const satisfies Record<DemoRole, DemoScenario>;
