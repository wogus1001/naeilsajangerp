import type { DemoGuide } from '../demoTypes';
import type { DemoFeatureSurfacePath } from './DemoFranchiseFeatureConfig';

export const DEMO_FEATURE_GUIDES: Record<DemoFeatureSurfacePath, DemoGuide> = {
    '/dashboard/franchise-leads/labor-planning': {
        badge: '출점 준비',
        title: '예상 매출을 실제 운영 인력 계획으로 바꿉니다.',
        description: '필요 인원과 인건비를 비교하고, 주간 근무표와 저장안까지 이어서 준비합니다.',
        steps: [
            { targetId: 'labor-plan-tabs', targetSelector: 'nav[aria-label="인력 세팅 보기"]', title: '업무 순서 선택', description: '계산, 추천안, 근무표, 저장안 순서로 오픈 전 인력 계획을 완성합니다.' },
            { targetId: 'labor-plan-input', targetSelector: 'section[aria-label="인력 계산 조건"]', title: '운영 조건 입력', description: '매장과 예상 매출, 영업시간을 입력해 필요한 인원과 인건비를 계산합니다.' },
            { targetId: 'labor-plan-result-tab', targetSelector: 'nav[aria-label="인력 세팅 보기"] button:nth-of-type(2)', title: '추천안 비교', description: '표준형과 절약형 등 여러 안을 비교해 매장 상황에 맞는 구성을 고릅니다.' },
            { targetId: 'labor-plan-roster-tab', targetSelector: 'nav[aria-label="인력 세팅 보기"] button:nth-of-type(3)', title: '근무표로 연결', description: '선택한 인력안을 주간 근무표로 옮겨 채용과 배치를 준비합니다.' }
        ]
    },
    '/dashboard/franchise-operations/schedule': {
        badge: '가맹 운영',
        title: '본사와 운영점의 후속 일정을 한곳에서 관리합니다.',
        description: '오늘 처리할 일부터 월간 일정과 담당자별 후속 업무까지 놓치지 않게 이어줍니다.',
        steps: [
            { targetId: 'schedule-kpis', targetSelector: 'section[aria-label="일정 핵심 현황"]', title: '오늘 일정 확인', description: '예정, 지연, 완료 건수를 먼저 확인해 처리 순서를 정합니다.' },
            { targetId: 'schedule-filter', targetSelector: 'section[aria-label="일정 필터"]', title: '필요한 일정만 보기', description: '운영점, 담당자, 일정 유형으로 확인할 업무를 빠르게 좁힙니다.' },
            { targetId: 'schedule-calendar', targetSelector: 'section[aria-label="월간 일정 달력"]', title: '월간 흐름 확인', description: '오픈 준비와 점검, 계약 후속 일정을 달력에서 겹치지 않게 확인합니다.' },
            { targetId: 'schedule-day-list', targetSelector: 'section[aria-label="선택 날짜 일정"]', title: '선택일 업무 처리', description: '선택한 날짜의 담당자와 후속 내용을 확인하고 업무를 마무리합니다.' }
        ]
    },
    '/dashboard/franchise-supervision': {
        badge: '운영 품질',
        title: '방문부터 보고서와 시정요청까지 이어서 관리합니다.',
        description: '본사는 운영 우선순위를 보고, 담당 SV는 방문과 후속 조치를 빠짐없이 처리합니다.',
        steps: [
            { targetId: 'supervision-tabs', targetSelector: '[role="tablist"][aria-label="슈퍼바이징 업무"]', title: '슈퍼바이징 업무 전환', description: '운영 현황, 배정, 방문, 보고서, 시정요청을 한 흐름으로 이동합니다.' },
            { targetId: 'supervision-overview', targetSelector: 'section[aria-label="슈퍼바이징 운영 리포트"]', title: '운영 현황 확인', description: '방문율, 승인 대기, 지연 건수를 보고 먼저 대응할 운영점을 찾습니다.' },
            { targetId: 'supervision-queue', targetSelector: 'section[aria-label="슈퍼바이징 운영 우선순위"]', title: '우선 업무 처리', description: '지연 방문과 미승인 보고서, 시정요청을 중요도 순서로 바로 처리합니다.' }
        ]
    },
    '/dashboard/franchise-operations/owner-portal': {
        badge: '점주 협업',
        title: '점주에게 필요한 안내와 요청을 운영점별로 관리합니다.',
        description: '계정 발급부터 공지, 체크리스트, 제출 요청까지 본사와 점주 사이의 업무를 연결합니다.',
        steps: [
            { targetId: 'owner-portal-tabs', targetSelector: '[role="tablist"][aria-label="점주 소통 업무"]', title: '점주 소통 업무 전환', description: '계정, 공지, 체크리스트, 제출 요청을 운영 목적에 맞게 선택합니다.' },
            { targetId: 'owner-portal-notices', targetSelector: 'section[aria-label="점주 공지 관리"]', title: '공지 전달', description: '전체 또는 특정 운영점에 필요한 본사 안내를 전달하고 읽음 상태를 확인합니다.' },
            { targetId: 'owner-portal-request-tab', targetSelector: '[role="tablist"][aria-label="점주 소통 업무"] button:nth-of-type(6)', title: '제출 요청 확인', description: '점주가 제출한 매장 정보와 문의를 확인하고 본사 후속 업무로 연결합니다.' },
            { targetId: 'owner-portal-accounts-tab', targetSelector: '[role="tablist"][aria-label="점주 소통 업무"] button:nth-of-type(7)', title: '운영점 계정 관리', description: '운영점별 점주 계정을 발급하고 로그인 상태와 비밀번호 재발급을 관리합니다.' }
        ]
    },
    '/owner/dashboard': {
        badge: '점주 홈페이지',
        title: '점주가 본사 요청과 매장 업무를 직접 확인합니다.',
        description: '발급받은 계정으로 공지, 체크리스트, 매장 정보, 시설 문의를 한곳에서 처리합니다.',
        steps: [
            { targetId: 'owner-dashboard-summary', targetSelector: 'section[aria-label="점주 업무 요약"]', title: '오늘 처리할 업무 확인', description: '미확인 공지, 남은 체크리스트, 처리 대기 요청을 먼저 확인합니다.' },
            { targetId: 'owner-dashboard-navigation', targetSelector: 'nav[aria-label="점주 포털 메뉴"]', title: '점주 업무 메뉴', description: '내 매장, 공지, 체크리스트, 시설 문의, 정산 제출을 업무별로 선택합니다.' },
            { targetId: 'owner-dashboard-submissions', targetSelector: 'section[aria-label="최근 제출 이력"]', title: '본사 제출 결과 확인', description: '점주가 본사에 전달한 요청과 검토 상태를 최근 순서로 확인합니다.' }
        ]
    },
    '/contracts/electronic': {
        badge: '계약 관리',
        title: '계약 작성부터 서명 완료까지 상태를 놓치지 않습니다.',
        description: '가맹 계약과 본사 양식을 구분하고, 발송·서명·취소 상태를 한곳에서 확인합니다.',
        steps: [
            { targetId: 'electronic-header', targetSelector: 'section[aria-label="전자계약 화면 제목"]', title: '전자계약 현황', description: '가맹 계약과 본사 양식의 처리 현황을 한 화면에서 시작합니다.' },
            { targetId: 'electronic-mode', targetSelector: 'section[aria-label="전자계약 업무 전환"]', title: '업무 유형 선택', description: '전자계약과 본사 양식을 구분해 필요한 문서 흐름으로 이동합니다.' },
            { targetId: 'electronic-scope', targetSelector: 'section[aria-label="전자계약 문서 범위"]', title: '문서 범위 확인', description: '내가 맡은 계약과 회사 전체 계약을 구분해 빠르게 확인합니다.' },
            { targetId: 'electronic-list', targetSelector: 'section[aria-label="전자계약 문서 목록"]', title: '서명 상태 관리', description: '발송, 서명 대기, 완료, 취소 상태와 만료 시점을 확인해 후속 업무를 진행합니다.' }
        ]
    },
    '/dashboard/franchise-vendors': {
        badge: '협력업체',
        title: '업체 정보와 계약 위험을 함께 관리합니다.',
        description: '인테리어·물류·설비 업체를 찾고, 계약 상태와 갱신 필요 여부를 빠르게 확인합니다.',
        steps: [
            { targetId: 'vendor-kpis', targetSelector: 'section[aria-label="업체 관리 핵심 현황"]', title: '업체 현황 확인', description: '전체 업체와 계약 업체, 갱신 필요 건수를 먼저 확인합니다.' },
            { targetId: 'vendor-filter', targetSelector: 'section[aria-label="업체 관리 검색 조건"]', title: '업체 검색', description: '업종, 지역, 계약 상태로 필요한 협력업체를 빠르게 찾습니다.' },
            { targetId: 'vendor-list', targetSelector: 'section[aria-label="업체 목록"]', title: '업체 상세 관리', description: '연락처와 담당자, 계약 위험을 확인하고 업체 정보를 이어서 관리합니다.' }
        ]
    },
    '/contracts/vendor': {
        badge: '업체 계약',
        title: '협력업체 계약의 검토와 갱신 시점을 관리합니다.',
        description: '계약 원본, 담당자, 만료일을 연결해 검토 대기와 갱신 누락을 줄입니다.',
        steps: [
            { targetId: 'vendor-contract-filter', targetSelector: 'section[aria-label="업체 계약 검색 조건"]', title: '계약 검색', description: '업체 유형, 계약 상태, 검색어로 확인할 계약을 좁힙니다.' },
            { targetId: 'vendor-contract-queue', targetSelector: 'section[aria-label="업체 계약 업무 큐"]', title: '우선 업무 확인', description: '검토 대기, 만료 예정, 갱신 필요 계약을 우선순위대로 확인합니다.' },
            { targetId: 'vendor-contract-list', targetSelector: 'section[aria-label="업체 계약 목록"]', title: '계약 상세 관리', description: '계약 원본과 담당자, 만료일, 변경 이력을 확인하고 갱신 또는 종료를 처리합니다.' }
        ]
    },
    '/contracts/vendor/register': {
        badge: '업체 계약',
        title: '업체 계약 원본과 담당 정보를 등록합니다.',
        description: '업체 선택부터 계약 기간, 담당자, 계약 원본까지 한 번에 연결합니다.',
        steps: [
            { targetId: 'vendor-contract-register-header', targetSelector: 'main h1', title: '계약 등록 또는 수정', description: '새 계약을 등록하거나 목록에서 선택한 계약 정보를 수정합니다.' },
            { targetId: 'vendor-contract-register-form', targetSelector: 'main form', title: '계약 정보 입력', description: '업체, 계약명, 시작일과 만료일, 담당자와 계약 원본을 입력합니다.' },
            { targetId: 'vendor-contract-register-save', targetSelector: 'main form button[type="submit"]', title: '계약 저장', description: '저장하면 업체 계약함에서 검토와 갱신 일정을 이어서 관리합니다.' }
        ]
    }
};
