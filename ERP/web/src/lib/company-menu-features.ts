export type CompanyMenuFeatureKey =
    | 'dashboard'
    | 'franchiseLeads'
    | 'franchiseWorkIntake'
    | 'franchiseMatchingRequest'
    | 'franchisePropertyRegistration'
    | 'marketInsights'
    | 'franchiseLocations'
    | 'franchiseOperations'
    | 'properties'
    | 'propertyRegister'
    | 'propertyMap'
    | 'schedule'
    | 'customers'
    | 'customerRegister'
    | 'businessCards'
    | 'businessCardRegister'
    | 'contracts'
    | 'electronicPremiumContracts'
    | 'vendorContracts'
    | 'vendorManagement'
    | 'contractCreate'
    | 'contractBuilder'
    | 'companyStaff';

export type CompanyMenuFlagMap = Readonly<Record<CompanyMenuFeatureKey, boolean>>;

export type CompanyDashboardMode = 'a' | 'b';

export const DEFAULT_COMPANY_DASHBOARD_MODE: CompanyDashboardMode = 'a';

export const COMPANY_DASHBOARD_MODES: readonly {
    readonly mode: CompanyDashboardMode;
    readonly label: string;
    readonly description: string;
}[] = [
    { mode: 'a', label: 'A 타입', description: '모객 DB와 출점 후보지 주요 건수를 먼저 보여줍니다.' },
    { mode: 'b', label: 'B 타입', description: '일정, 계약, 점포, 고객 중심의 기존 요약 화면입니다.' }
] as const;

export type CompanyMenuFeatureDefinition = {
    readonly key: CompanyMenuFeatureKey;
    readonly category: string;
    readonly title: string;
    readonly description: string;
    readonly routePrefixes: readonly string[];
};

export type CompanyMenuFeatureRow = {
    readonly feature_key: string;
    readonly enabled: boolean | null;
};

export const COMPANY_MENU_FEATURES: readonly CompanyMenuFeatureDefinition[] = [
    {
        key: 'dashboard',
        category: '대시보드',
        title: '대시보드',
        description: '전체 현황과 주요 업무 흐름 요약을 보여줍니다.',
        routePrefixes: ['/dashboard']
    },
    {
        key: 'franchiseLeads',
        category: '프랜차이즈',
        title: '모객 DB',
        description: '가맹 희망자 유입, 상담, 계약 전환 흐름을 관리합니다.',
        routePrefixes: ['/dashboard/franchise-leads']
    },
    {
        key: 'franchiseMatchingRequest',
        category: '업무',
        title: '예비 창업자 등록',
        description: '예비 창업자 정보를 모객 DB로 등록합니다.',
        routePrefixes: ['/dashboard/franchise-leads/matching-request']
    },
    {
        key: 'franchisePropertyRegistration',
        category: '업무',
        title: '입점 요청',
        description: '프랜차이즈 입점 요청 정보를 별도로 등록합니다.',
        routePrefixes: ['/dashboard/franchise-leads/property-registration']
    },
    {
        key: 'franchiseWorkIntake',
        category: '업무',
        title: '진행현황',
        description: '입점 요청과 예비 창업자 등록 입력 건을 탭으로 확인합니다.',
        routePrefixes: ['/dashboard/franchise-leads/work-intake']
    },
    {
        key: 'marketInsights',
        category: '프랜차이즈',
        title: '출점 후보지',
        description: '후보지, 외부 상가, 상권 검토 데이터를 관리합니다.',
        routePrefixes: ['/dashboard/franchise-leads/market-insights', '/dashboard/franchise-leads/labor-planning']
    },
    {
        key: 'franchiseLocations',
        category: '출점 후보지',
        title: '물건지 지도',
        description: '가맹 운영점과 출점 후보지를 지도에서 함께 확인합니다.',
        routePrefixes: ['/dashboard/franchise-locations']
    },
    {
        key: 'franchiseOperations',
        category: '프랜차이즈',
        title: '가맹 운영',
        description: '오픈 준비와 운영 전환 업무를 확인합니다.',
        routePrefixes: ['/dashboard/franchise-operations', '/dashboard/franchise-supervision']
    },
    {
        key: 'properties',
        category: '점포개발 업무',
        title: '점포 목록',
        description: '점포 물건지 목록과 상세 정보를 조회합니다.',
        routePrefixes: ['/properties']
    },
    {
        key: 'propertyRegister',
        category: '점포개발 업무',
        title: '점포 신규등록',
        description: '새 점포 물건지를 직접 등록합니다.',
        routePrefixes: ['/properties/register']
    },
    {
        key: 'propertyMap',
        category: '점포개발 업무',
        title: '물건지도',
        description: '점포 물건지를 지도에서 확인합니다.',
        routePrefixes: ['/properties/map']
    },
    {
        key: 'schedule',
        category: '점포개발 업무',
        title: '일정관리',
        description: '상담, 방문, 후속 연락 일정을 관리합니다.',
        routePrefixes: ['/schedule']
    },
    {
        key: 'customers',
        category: '고객관리',
        title: '고객목록',
        description: '전환된 고객 DB를 조회합니다.',
        routePrefixes: ['/customers']
    },
    {
        key: 'customerRegister',
        category: '고객관리',
        title: '고객 신규입력',
        description: '새 고객 정보를 직접 등록합니다.',
        routePrefixes: ['/customers/register']
    },
    {
        key: 'businessCards',
        category: '명함관리',
        title: '명함목록',
        description: '명함 DB와 고객 연결 상태를 조회합니다.',
        routePrefixes: ['/business-cards']
    },
    {
        key: 'businessCardRegister',
        category: '명함관리',
        title: '명함 신규입력',
        description: '새 명함 정보를 직접 등록합니다.',
        routePrefixes: ['/business-cards/register']
    },
    {
        key: 'contracts',
        category: '계약',
        title: '계약관리',
        description: '계약 목록과 진행 상태를 확인합니다.',
        routePrefixes: ['/contracts']
    },
    {
        key: 'electronicPremiumContracts',
        category: '계약·업체 관리',
        title: '전자계약',
        description: '공통 템플릿과 회사 템플릿으로 전자계약 문서를 작성하고 발송합니다.',
        routePrefixes: ['/contracts/electronic']
    },
    {
        key: 'vendorContracts',
        category: '계약·업체 관리',
        title: '업체 계약함',
        description: '외부 업체 계약과 만료 알림을 회사 단위로 관리합니다.',
        routePrefixes: ['/contracts/vendor']
    },
    {
        key: 'vendorManagement',
        category: '계약·업체 관리',
        title: '업체 관리',
        description: '계약 데이터를 업체별로 묶어 거래처 현황과 만료 리스크를 확인합니다.',
        routePrefixes: ['/dashboard/franchise-vendors']
    },
    {
        key: 'contractCreate',
        category: '계약',
        title: '간편 서명 시작',
        description: '전자 계약 발송 흐름을 시작합니다.',
        routePrefixes: ['/contracts/create']
    },
    {
        key: 'contractBuilder',
        category: '계약',
        title: '계약 양식 만들기',
        description: '계약 템플릿을 구성합니다.',
        routePrefixes: ['/contracts/builder']
    },
    {
        key: 'companyStaff',
        category: '회사 설정',
        title: '직원 관리',
        description: '회사 내부 직원과 권한을 관리합니다.',
        routePrefixes: ['/company/staff']
    }
];

export function getDefaultCompanyMenuFlags(): CompanyMenuFlagMap {
    return {
        dashboard: true,
        franchiseLeads: true,
        franchiseWorkIntake: true,
        franchiseMatchingRequest: true,
        franchisePropertyRegistration: true,
        marketInsights: true,
        franchiseLocations: true,
        franchiseOperations: true,
        properties: true,
        propertyRegister: true,
        propertyMap: true,
        schedule: true,
        customers: true,
        customerRegister: true,
        businessCards: true,
        businessCardRegister: true,
        contracts: true,
        electronicPremiumContracts: true,
        vendorContracts: true,
        vendorManagement: true,
        contractCreate: true,
        contractBuilder: true,
        companyStaff: true
    };
}

export function isCompanyMenuFeatureKey(value: string): value is CompanyMenuFeatureKey {
    return COMPANY_MENU_FEATURES.some(feature => feature.key === value);
}

export function isCompanyDashboardMode(value: unknown): value is CompanyDashboardMode {
    return value === 'a' || value === 'b';
}

export function normalizeCompanyDashboardMode(value: unknown): CompanyDashboardMode {
    return isCompanyDashboardMode(value) ? value : DEFAULT_COMPANY_DASHBOARD_MODE;
}

export function normalizeCompanyMenuFlags(rows: readonly CompanyMenuFeatureRow[]): CompanyMenuFlagMap {
    const hasSavedMenuRows = rows.some(row => isCompanyMenuFeatureKey(row.feature_key));
    const flags: Record<CompanyMenuFeatureKey, boolean> = hasSavedMenuRows
        ? Object.fromEntries(COMPANY_MENU_FEATURES.map(feature => [feature.key, false])) as Record<CompanyMenuFeatureKey, boolean>
        : { ...getDefaultCompanyMenuFlags() };

    for (const row of rows) {
        if (isCompanyMenuFeatureKey(row.feature_key)) {
            flags[row.feature_key] = row.enabled !== false;
        }
    }

    return flags;
}

export function isCompanyMenuEnabled(flags: CompanyMenuFlagMap | null | undefined, key: CompanyMenuFeatureKey): boolean {
    return flags?.[key] !== false;
}

export function getCompanyMenuFeatureForPath(pathname: string): CompanyMenuFeatureDefinition | null {
    let bestFeature: CompanyMenuFeatureDefinition | null = null;
    let bestPrefixLength = 0;

    for (const feature of COMPANY_MENU_FEATURES) {
        for (const prefix of feature.routePrefixes) {
            const isMatch = pathname === prefix || pathname.startsWith(`${prefix}/`);
            if (isMatch && prefix.length > bestPrefixLength) {
                bestFeature = feature;
                bestPrefixLength = prefix.length;
            }
        }
    }

    return bestFeature;
}

const companyMenuFeatures = {
    COMPANY_DASHBOARD_MODES,
    COMPANY_MENU_FEATURES,
    DEFAULT_COMPANY_DASHBOARD_MODE,
    getCompanyMenuFeatureForPath,
    getDefaultCompanyMenuFlags,
    isCompanyDashboardMode,
    isCompanyMenuEnabled,
    isCompanyMenuFeatureKey,
    normalizeCompanyDashboardMode,
    normalizeCompanyMenuFlags
};

export default companyMenuFeatures;
