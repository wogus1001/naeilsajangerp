export type CompanyMenuFeatureKey =
    | 'dashboard'
    | 'franchiseLeads'
    | 'marketInsights'
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
    {
        mode: 'a',
        label: 'A 타입',
        description: '모객 DB와 출점 후보지 주요 건수를 먼저 보여줍니다.'
    },
    {
        mode: 'b',
        label: 'B 타입',
        description: '일정, 계약, 점포, 고객 중심의 기존 요약 화면입니다.'
    }
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
        title: '요약',
        description: '전체 현황과 주요 업무 흐름 요약을 보여줍니다.',
        routePrefixes: ['/dashboard']
    },
    {
        key: 'franchiseLeads',
        category: '대시보드',
        title: '모객 DB',
        description: '가맹 희망자 유입, 상담, 계약 전환 흐름을 관리합니다.',
        routePrefixes: ['/dashboard/franchise-leads']
    },
    {
        key: 'marketInsights',
        category: '대시보드',
        title: '출점 후보지',
        description: '후보지, 외부 상가, 상권 검토 데이터를 관리합니다.',
        routePrefixes: ['/dashboard/franchise-leads/market-insights']
    },
    {
        key: 'franchiseOperations',
        category: '대시보드',
        title: '가맹 운영',
        description: '오픈 준비와 운영 전환 업무를 확인합니다.',
        routePrefixes: ['/dashboard/franchise-operations']
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
        marketInsights: true,
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
    const flags: Record<CompanyMenuFeatureKey, boolean> = { ...getDefaultCompanyMenuFlags() };

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
