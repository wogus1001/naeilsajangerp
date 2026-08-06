export const DEMO_FEATURE_SURFACES = {
    '/dashboard/franchise-leads/labor-planning': {
        title: '인력 세팅',
        description: '출점 후보지와 운영점의 예상 매출을 기준으로 인력 구성, 인건비, 근무표를 계산합니다.'
    },
    '/dashboard/franchise-operations/schedule': {
        title: '일정관리',
        description: '가맹 운영 일정을 한 달 단위로 확인하고 담당자별 후속 업무를 관리합니다.'
    },
    '/dashboard/franchise-supervision': {
        title: '슈퍼바이징',
        description: 'SV 배정, 방문 일정, 점검 보고서, 승인과 시정요청을 본사 운영 관점에서 관리합니다.'
    },
    '/dashboard/franchise-operations/owner-portal': {
        title: '점주 소통',
        description: '운영점별 점주 계정, 공지, 제출 요청을 본사에서 관리합니다.'
    },
    '/owner/dashboard': {
        title: '점주 홈페이지',
        description: '본사에서 발급받은 계정으로 점주가 공지, 체크리스트, 제출 요청을 처리합니다.'
    },
    '/contracts/electronic': {
        title: '전자계약',
        description: '가맹 계약서와 본사 양식을 만들고 발송·서명 상태를 한곳에서 확인합니다.'
    },
    '/dashboard/franchise-vendors': {
        title: '업체 관리',
        description: '인테리어, 물류, 설비 등 협력업체의 기본 정보와 계약 위험을 관리합니다.'
    },
    '/contracts/vendor': {
        title: '업체 계약함',
        description: '협력업체 계약의 작성, 검토, 승인, 갱신 일정을 이어서 관리합니다.'
    },
    '/contracts/vendor/register': {
        title: '업체 계약 등록',
        description: '업체 계약 원본과 계약 기간, 담당자, 갱신 정보를 등록하거나 수정합니다.'
    }
} as const;

export type DemoFeatureSurfacePath = keyof typeof DEMO_FEATURE_SURFACES;

export function isDemoFeatureSurfacePath(path: string): path is DemoFeatureSurfacePath {
    return path in DEMO_FEATURE_SURFACES;
}
