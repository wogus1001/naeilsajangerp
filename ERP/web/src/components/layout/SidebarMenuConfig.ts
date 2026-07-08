import type { CompanyMenuFeatureKey } from '@/lib/company-menu-features';

export type SidebarSectionKey =
    | 'dashboard'
    | 'franchise'
    | 'franchiseWork'
    | 'consulting'
    | 'customers'
    | 'businessCards'
    | 'contracts';
export type SidebarLinkIcon =
    | 'target'
    | 'mapPin'
    | 'store'
    | 'users'
    | 'list'
    | 'fileSignature'
    | 'clipboardCheck'
    | 'calculator';

export type SidebarMenuItem = {
    readonly title: string;
    readonly url?: string;
    readonly category: string;
    readonly featureKey: CompanyMenuFeatureKey;
    readonly icon?: SidebarLinkIcon;
    readonly depth?: 0 | 1;
    readonly group?: boolean;
};

export type SidebarMenuSection = {
    readonly key: SidebarSectionKey;
    readonly title: string;
    readonly collapsedTitle: string;
    readonly direct?: boolean;
    readonly items: readonly SidebarMenuItem[];
};

export const SIDEBAR_SECTIONS: readonly SidebarMenuSection[] = [
    {
        key: 'dashboard',
        title: '대시보드',
        collapsedTitle: '대시보드',
        direct: true,
        items: [
            { title: '대시보드', url: '/dashboard', category: '대시보드', featureKey: 'dashboard' }
        ]
    },
    {
        key: 'franchise',
        title: '프랜차이즈',
        collapsedTitle: '프랜차이즈',
        items: [
            { title: '모객 DB', url: '/dashboard/franchise-leads', category: '프랜차이즈', featureKey: 'franchiseLeads', icon: 'target' },
            { title: '출점 후보지', category: '프랜차이즈', featureKey: 'marketInsights', icon: 'mapPin', group: true },
            { title: '후보지 목록', url: '/dashboard/franchise-leads/market-insights', category: '출점 후보지', featureKey: 'marketInsights', icon: 'list', depth: 1 },
            { title: '인력 세팅', url: '/dashboard/franchise-leads/labor-planning', category: '출점 후보지', featureKey: 'marketInsights', icon: 'calculator', depth: 1 },
            { title: '물건지 지도', url: '/dashboard/franchise-locations', category: '출점 후보지', featureKey: 'franchiseLocations', icon: 'mapPin', depth: 1 },
            { title: '가맹 운영', category: '프랜차이즈', featureKey: 'franchiseOperations', icon: 'store', group: true },
            { title: '가맹점 목록', url: '/dashboard/franchise-operations', category: '가맹 운영', featureKey: 'franchiseOperations', icon: 'list', depth: 1 },
            { title: '슈퍼바이징', url: '/dashboard/franchise-supervision', category: '가맹 운영', featureKey: 'franchiseOperations', icon: 'clipboardCheck', depth: 1 },
            { title: '점주 소통', url: '/dashboard/franchise-operations/owner-portal', category: '가맹 운영', featureKey: 'franchiseOperations', icon: 'users', depth: 1 },
            { title: '계약·업체 관리', category: '프랜차이즈', featureKey: 'electronicPremiumContracts', icon: 'fileSignature', group: true },
            { title: '전자계약', url: '/contracts/electronic', category: '계약·업체 관리', featureKey: 'electronicPremiumContracts', icon: 'fileSignature', depth: 1 },
            { title: '업체 관리', url: '/dashboard/franchise-vendors', category: '계약·업체 관리', featureKey: 'vendorManagement', icon: 'users', depth: 1 },
            { title: '업체 계약함', url: '/contracts/vendor', category: '계약·업체 관리', featureKey: 'vendorContracts', icon: 'fileSignature', depth: 1 }
        ]
    },
    {
        key: 'franchiseWork',
        title: '업무',
        collapsedTitle: '업무',
        items: [
            { title: '진행현황', url: '/dashboard/franchise-leads/work-intake', category: '업무', featureKey: 'franchiseWorkIntake', icon: 'list' },
            { title: '입점 요청', url: '/dashboard/franchise-leads/property-registration', category: '업무', featureKey: 'franchisePropertyRegistration', icon: 'store' },
            { title: '예비 창업자 등록', url: '/dashboard/franchise-leads/matching-request', category: '업무', featureKey: 'franchiseMatchingRequest', icon: 'target' }
        ]
    },
    {
        key: 'consulting',
        title: '점포개발 업무',
        collapsedTitle: '점포개발 업무',
        items: [
            { title: '점포 목록', url: '/properties', category: '점포개발 업무', featureKey: 'properties' },
            { title: '점포 신규등록', url: '/properties/register', category: '점포개발 업무', featureKey: 'propertyRegister' },
            { title: '물건지도', url: '/properties/map', category: '점포개발 업무', featureKey: 'propertyMap' },
            { title: '일정관리', url: '/schedule', category: '점포개발 업무', featureKey: 'schedule' }
        ]
    },
    {
        key: 'customers',
        title: '고객관리',
        collapsedTitle: '고객관리',
        items: [
            { title: '고객목록', url: '/customers', category: '고객관리', featureKey: 'customers' },
            { title: '신규입력', url: '/customers/register', category: '고객관리', featureKey: 'customerRegister' }
        ]
    },
    {
        key: 'businessCards',
        title: '명함관리',
        collapsedTitle: '명함관리',
        items: [
            { title: '명함목록', url: '/business-cards', category: '명함관리', featureKey: 'businessCards' },
            { title: '신규입력', url: '/business-cards/register', category: '명함관리', featureKey: 'businessCardRegister' }
        ]
    },
    {
        key: 'contracts',
        title: '계약',
        collapsedTitle: '계약',
        items: [
            { title: '계약관리', url: '/contracts', category: '계약', featureKey: 'contracts' },
            { title: '간편 서명 시작(전자)', url: '/contracts/create', category: '계약', featureKey: 'contractCreate' },
            { title: '새 계약 양식 만들기', url: '/contracts/builder', category: '계약', featureKey: 'contractBuilder' }
        ]
    }
];

export const SIDEBAR_MENU_ITEMS: readonly SidebarMenuItem[] = SIDEBAR_SECTIONS.flatMap(section => section.items);
