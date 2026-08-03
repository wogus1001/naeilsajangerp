export type HeaderBreadcrumb = {
    readonly category: string;
    readonly title: string;
};

export function getHeaderBreadcrumb(path: string): HeaderBreadcrumb {
    if (path === '/dashboard') return { category: '메인', title: '대시보드' };
    if (path === '/approvals') return { category: '전자결재', title: '홈' };
    if (path === '/approvals/write') return { category: '전자결재', title: '작성하기' };
    if (path === '/approvals/pending') return { category: '전자결재', title: '결재 대기' };
    if (path === '/approvals/mine') return { category: '전자결재', title: '내 문서함' };
    if (path === '/approvals/department') return { category: '전자결재', title: '부서 문서함' };
    if (path === '/approvals/templates') return { category: '전자결재', title: '양식 관리' };
    if (path === '/approvals/settings') return { category: '전자결재', title: '조직·결재 설정' };
    if (path.startsWith('/approvals/')) return { category: '전자결재', title: '결재 문서' };
    if (path === '/dashboard/franchise-leads') return { category: '프랜차이즈', title: '모객 DB' };
    if (path === '/dashboard/franchise-leads/matching-request') return { category: '업무', title: '예비 창업자 등록' };
    if (path === '/dashboard/franchise-leads/property-registration') return { category: '업무', title: '입점 요청' };
    if (path === '/dashboard/franchise-leads/lead-registration') return { category: '업무', title: '가맹 희망자 등록' };
    if (path === '/dashboard/franchise-leads/work-intake') return { category: '업무', title: '진행현황' };
    if (path === '/dashboard/franchise-leads/market-insights') return { category: '프랜차이즈', title: '출점 후보지' };
    if (path === '/dashboard/franchise-operations') return { category: '프랜차이즈', title: '가맹 운영' };
    if (path === '/dashboard/franchise-operations/schedule') return { category: '가맹 운영', title: '일정관리' };

    if (path === '/properties') return { category: '점포개발 업무', title: '점포 목록' };
    if (path === '/properties/register') return { category: '점포개발 업무', title: '점포 신규등록' };
    if (path === '/properties/map') return { category: '점포개발 업무', title: '물건지도' };
    if (path === '/schedule') return { category: '점포개발 업무', title: '일정관리' };
    if (path.startsWith('/properties/')) return { category: '점포개발 업무', title: '점포 상세' };

    if (path === '/customers') return { category: '고객관리', title: '고객목록' };
    if (path === '/customers/register') return { category: '고객관리', title: '신규입력' };
    if (path.startsWith('/customers/')) return { category: '고객관리', title: '고객 상세' };

    if (path === '/business-cards') return { category: '명함관리', title: '명함목록' };
    if (path === '/business-cards/register') return { category: '명함관리', title: '신규입력' };

    if (path === '/contracts') return { category: '계약', title: '계약관리' };
    if (path === '/contracts/electronic') return { category: '프랜차이즈', title: '전자계약' };
    if (path === '/contracts/electronic/create') return { category: '프랜차이즈', title: '전자계약 작성' };
    if (path === '/dashboard/franchise-vendors') return { category: '프랜차이즈', title: '업체 관리' };
    if (path === '/contracts/vendor') return { category: '프랜차이즈', title: '업체 계약함' };
    if (path === '/contracts/create') return { category: '계약', title: '간편 서명 시작(전자)' };
    if (path === '/contracts/builder') return { category: '계약', title: '새 계약 양식 만들기' };
    if (path.startsWith('/contracts/')) return { category: '계약', title: '계약 상세' };

    if (path === '/admin/franchise-intake') return { category: '관리자', title: '프랜차이즈 인입 관리' };
    if (path.startsWith('/admin')) return { category: '관리자', title: '회원 관리' };

    if (path === '/company/staff') return { category: '메인', title: '직원 관리' };

    if (path === '/board/notices') return { category: '게시판', title: '공지사항' };
    if (path === '/board/notices/write') return { category: '게시판', title: '공지사항 작성' };
    if (path.startsWith('/board/notices/') && path.endsWith('/edit')) {
        return { category: '게시판', title: '공지사항 수정' };
    }
    if (path.startsWith('/board/notices/')) return { category: '게시판', title: '공지사항 상세' };

    return { category: '메인', title: '대시보드' };
}

export function resolveHeaderBreadcrumb(
    path: string,
    override?: HeaderBreadcrumb
): HeaderBreadcrumb {
    return override ?? getHeaderBreadcrumb(path);
}
