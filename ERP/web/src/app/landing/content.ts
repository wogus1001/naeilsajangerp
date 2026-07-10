export type FeatureMock =
    | {
        readonly kind: 'chips';
        readonly items: readonly string[];
    }
    | {
        readonly kind: 'checklist';
        readonly items: readonly string[];
    }
    | {
        readonly kind: 'progress';
        readonly items: readonly {
            readonly label: string;
            readonly value: string;
            readonly percent: string;
        }[];
    }
    | {
        readonly kind: 'table';
        readonly headers: readonly string[];
        readonly rows: readonly (readonly string[])[];
    };

export type FeatureDetail = {
    readonly title: string;
    readonly statusLabel?: string;
    readonly situation: string;
    readonly capabilities: readonly string[];
    readonly outcome: string;
    readonly mock: FeatureMock;
};

export type TeamScene = {
    readonly team: string;
    readonly title: string;
    readonly description: string;
};

export type SheetComparisonColumn = {
    readonly title: string;
    readonly description: string;
    readonly items: readonly string[];
};

export type ErpBenefit = {
    readonly title: string;
    readonly description: string;
};

export const SHEET_COMPARISON = [
    {
        title: '직접 구축·개별 채용',
        description: '플랫폼 앱 구축, ERP, 마케터 채용, 매뉴얼 제작, 본부 구축 컨설팅을 각각 진행하면 초기비와 월 고정비가 동시에 커집니다.',
        items: ['플랫폼 앱 구축비와 유지보수비', 'ERP 구축·운영 비용', '마케터 채용과 광고 운영 인건비', '매뉴얼 제작·본부 구축 비용 +@']
    },
    {
        title: '프랜차이즈 본부 ERP 성장 패키지',
        description: '전문가들이 자사앱과 랜딩, ERP와 자동화, 영업 실행, 마케팅 소재, 가맹관리 매뉴얼이 정착될 때까지 같은 기준으로 돕습니다.',
        items: ['가맹 DB와 상담 상태 통합', '푸시·쇼츠 자동화 운영', '자사앱과 ERP 연결', '가맹관리 매뉴얼·정착 지원 동시 제공']
    }
] as const satisfies readonly SheetComparisonColumn[];

export const ERP_BENEFITS = [
    {
        title: '시스템 구축',
        description: '프랜차이즈 본부 ERP와 자사앱, 랜딩으로 상담, 계약, 오픈, 운영 기록을 정리합니다.'
    },
    {
        title: '유입 채널 운영',
        description: '푸시와 쇼츠 채널을 운영해 고객 접점과 상담 유입 흐름을 빠르게 반복합니다.'
    },
    {
        title: '영업·본사 컨설팅',
        description: '영업대행, 마케팅 소재 제작, 본사 구축 매뉴얼 제작까지 전문가 실행 단위로 제공합니다.'
    }
] as const satisfies readonly ErpBenefit[];

export const FEATURE_DETAILS = [
    {
        title: '프랜차이즈 본부 ERP',
        situation: '가맹 문의, 상담, 출점 후보지, 정보공개서, 계약, 오픈 준비, 가맹 운영을 한 화면 흐름으로 정리합니다.',
        capabilities: ['상담 DB와 담당자 업무 목록', '출점 후보지와 외부 상가 연결', '정보공개서·계약·운영 이력 관리'],
        outcome: '본사 직원이 오늘 처리할 업무와 다음 팀에 넘길 기록을 같은 기준으로 확인합니다.',
        mock: {
            kind: 'table',
            headers: ['업무', '담당', '상태'],
            rows: [
                ['모객 DB', '가맹개발', '상담중'],
                ['후보지', '출점개발', '검토중'],
                ['계약', '계약 담당', '진행중']
            ]
        }
    },
    {
        title: '푸시 자동화 프로그램',
        situation: '리드, 고객, 점주, 앱 사용자에게 필요한 알림을 조건별로 보내는 자동화 흐름을 구성합니다.',
        capabilities: ['프로모션 푸시', 'Ex. 3일 미방문 고객 재방문 푸시', '세그먼트별 발송 조건과 결과 기록', 'ERP·자사앱 이벤트 연동'],
        outcome: '광고 후속, 상담 리마인드, 재방문 쿠폰, 점주 공지처럼 반복되는 커뮤니케이션을 자동화합니다.',
        mock: {
            kind: 'chips',
            items: ['프로모션 푸시', '3일 미방문', '재방문 쿠폰', '상담 리마인드']
        }
    },
    {
        title: '쇼츠 자동화',
        situation: '브랜드 소개, 매장 사례, 창업 상담 소재를 숏폼 콘텐츠로 반복 제작하고 배포 흐름을 잡습니다.',
        capabilities: ['쇼츠 주제 기획', '소재 템플릿과 제작 요청 관리', '캠페인별 유입 성과 기록'],
        outcome: '콘텐츠 제작이 일회성으로 끝나지 않고 상담 DB와 캠페인 운영으로 이어집니다.',
        mock: {
            kind: 'progress',
            items: [
                { label: '브랜드 소개', value: '제작중', percent: '72%' },
                { label: '매장 사례', value: '검수', percent: '54%' },
                { label: '창업 FAQ', value: '기획', percent: '36%' }
            ]
        }
    },
    {
        title: '프랜차이즈 자사앱',
        situation: '고객, 점주, 예비 창업자가 브랜드와 다시 만나는 앱 접점을 CRM과 프로모션 운영 목적에 맞춰 구성합니다.',
        capabilities: ['브랜드 전용 앱 구조 설계', 'CRM 고객 데이터 관리', '쿠폰·이벤트 프로모션 자동화'],
        outcome: '본사가 직접 관리하는 앱 채널에서 고객 관리, 알림, 콘텐츠, 프로모션 운영을 함께 진행합니다.',
        mock: {
            kind: 'chips',
            items: ['브랜드 홈', 'CRM', '쿠폰 자동화', '콘텐츠 피드']
        }
    },
    {
        title: '영업대행·마케팅 소재',
        situation: '가맹 상담을 위한 영업 실행과 광고·상담·숏폼 소재 제작을 같이 운영합니다.',
        capabilities: ['가맹 문의 상담 운영', '광고·상담 스크립트 제작', '숏폼·이미지·랜딩 소재 제작'],
        outcome: '시스템만 납품하는 것이 아니라 실제 유입과 상담 전환에 필요한 실행을 함께 제공합니다.',
        mock: {
            kind: 'checklist',
            items: ['상담 스크립트 정리', '광고 소재 제작', '가맹 문의 후속']
        }
    },
    {
        title: '가맹관리 매뉴얼',
        situation: '프랜차이즈 본사가 반복 운영할 기준을 만들 수 있도록 가맹관리 매뉴얼과 자료 배포 기준을 정리합니다.',
        capabilities: ['체크리스트 전산화', '가맹점·SV·계약 매뉴얼 제작', '초기 운영 정착 점검'],
        outcome: '가맹관리 매뉴얼과 운영 및 마케팅 자료를 배포하고 점검합니다.',
        mock: {
            kind: 'table',
            headers: ['문서', '대상', '상태'],
            rows: [
                ['상담 매뉴얼', '영업팀', '작성'],
                ['오픈 체크', '운영팀', '검수'],
                ['점주 안내', '가맹점', '배포']
            ]
        }
    }
] as const satisfies readonly FeatureDetail[];

export const TEAM_SCENES = [
    {
        team: '대표/본부장',
        title: '본사 구축 범위를 한 번에 판단',
        description: 'ERP, 자동화, 자사앱, 영업대행, 매뉴얼 제작 범위를 같은 계획으로 봅니다.'
    },
    {
        team: '가맹개발팀',
        title: '유입 DB와 상담 후속 관리',
        description: '영업대행과 광고 유입을 ERP 상담 목록으로 받아 상담 상태와 다음 연락을 관리합니다.'
    },
    {
        team: '마케팅팀',
        title: '채널 운영과 콘텐츠 제작 관리',
        description: '캠페인별 소재, 숏폼 주제, 푸시 메시지를 상담 전환 기준으로 정리합니다.'
    },
    {
        team: '운영/SV팀',
        title: '매뉴얼과 앱 공지로 운영 정착',
        description: '가맹관리 매뉴얼, 점주 공지, 오픈 준비와 운영 후속 업무를 같은 기준으로 이어받습니다.'
    }
] as const satisfies readonly TeamScene[];
