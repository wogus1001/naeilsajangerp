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
        title: '구글시트 관리',
        description: '기록은 빠르지만 담당자 기준과 다음 업무가 흩어지기 쉽습니다.',
        items: ['담당자마다 입력 기준 다름', '다음 연락일 누락', '상태 변경 이력 확인 어려움', '계약·오픈 인계 별도 관리']
    },
    {
        title: 'FC ERP',
        description: '모객 DB가 상담, 계약, 오픈 준비로 이어지는 공통 업무 기준이 됩니다.',
        items: ['담당자·상태·다음 연락 기준 통일', '중요 희망자 표시', '상담 이력 누적', '계약·오픈 준비로 연결']
    }
] as const satisfies readonly SheetComparisonColumn[];

export const ERP_BENEFITS = [
    {
        title: '처리할 DB 확인',
        description: '연락 지연, 오늘 연락, 다음 액션을 같은 기준으로 정리합니다.'
    },
    {
        title: '중복·누락 감소',
        description: '같은 연락처와 상담 이력을 함께 확인해 중복 입력과 후속 누락을 줄입니다.'
    },
    {
        title: '계약 이후 인계 정리',
        description: '상담 기록을 정보공개서, 계약, 오픈 준비 흐름으로 끊기지 않게 넘깁니다.'
    }
] as const satisfies readonly ErpBenefit[];

export const FEATURE_DETAILS = [
    {
        title: '모객 DB',
        situation: '광고, 박람회, 소개, 전화 문의와 Meta Lead Ads 유입을 1차 유입 DB와 가맹 희망자 흐름으로 정리합니다.',
        capabilities: ['상태·담당자·다음 연락일 관리', '정보공개서 컬럼과 계약 가능일 확인', '엑셀·PDF·인쇄 추출'],
        outcome: '담당자가 오늘 처리할 고객과 계약 전 필요한 액션을 한 화면에서 확인합니다.',
        mock: {
            kind: 'table',
            headers: ['이름', '유입', '상태'],
            rows: [
                ['김민준', 'Meta 광고', '상담중'],
                ['박서연', '박람회', '입지검토'],
                ['이도윤', '소개', '계약예정']
            ]
        }
    },
    {
        title: '출점 후보지',
        situation: '후보자가 원하는 지역과 외부 상가 데이터를 분리해서 보고 필요한 물건지만 연결합니다.',
        capabilities: ['지역 인사이트와 후보지 목록 연결', '입점 요청 밀어넣기와 파일 연동', '협력업체 작성자 기준 권한 분리'],
        outcome: '출점개발팀이 상담 중인 고객과 검토 가능한 후보지를 같은 지역 기준으로 연결합니다.',
        mock: {
            kind: 'chips',
            items: ['서울 송파구', '대전 유성구', '부산 해운대구', '외부 상가 연결']
        }
    },
    {
        title: '정보공개서',
        situation: '회사별 정보공개서 문서를 저장하고 담당자 Gmail로 고객에게 발송합니다.',
        capabilities: ['저장 문서 선택 발송', '수령 확인 링크와 열람 추정', '14일 계약 잠금 기준 자동 확인'],
        outcome: '계약 담당자가 발송 이력과 고객 확인 시각을 안전하게 추적합니다.',
        mock: {
            kind: 'checklist',
            items: ['정보공개서 수령 확인', '계약 가능일 확인', '계약 서류 준비']
        }
    },
    {
        title: '전자계약',
        situation: 'ERP 양식에 계약 내용을 입력하면 권리금계약서 미리보기와 유캔싸인 발송 데이터로 연결합니다.',
        capabilities: ['인허가번호 내부 DB 조회', '계약서 미리보기', '내일사장 공용 유캔싸인 발송'],
        outcome: '담당자별 발송 문서와 회사 문서를 ERP 기준으로 분리해 확인합니다.',
        mock: {
            kind: 'progress',
            items: [
                { label: '인테리어 협의', value: '완료', percent: '100%' },
                { label: '교육 일정', value: '진행중', percent: '64%' },
                { label: '초도 물류', value: '대기', percent: '32%' }
            ]
        }
    },
    {
        title: '알림/가맹 운영',
        situation: '연락 지연, 정보공개서 D-3/D-1, 오픈 준비와 운영 후속 업무를 알림으로 모읍니다.',
        capabilities: ['개별 읽음 처리', '상세 패널 이동', '가맹 운영 목록 export'],
        outcome: '본사 담당자가 놓치기 쉬운 후속 업무를 알림과 운영 화면에서 이어서 처리합니다.',
        mock: {
            kind: 'chips',
            items: ['운영중', '후속 확인', '점주 요청', '본사 조치']
        }
    }
] as const satisfies readonly FeatureDetail[];

export const TEAM_SCENES = [
    {
        team: '가맹개발팀',
        title: '상태별 파이프라인으로 모객 추적',
        description: '문의접수, 상담중, 입지검토, 계약예정 상태를 보고 담당자별 다음 연락을 잡습니다.'
    },
    {
        team: '출점개발팀',
        title: '희망지역과 후보지를 연결',
        description: '상담 중인 후보의 조건을 보고 검토할 후보지와 외부 상가를 좁힙니다.'
    },
    {
        team: '계약/오픈 담당',
        title: '계약 가능일과 오픈 준비 확인',
        description: '정보공개서 기록, 계약 전 체크, 오픈 준비 항목을 이어서 관리합니다.'
    },
    {
        team: '운영팀',
        title: '오픈 이후 후속 업무 인계',
        description: '계약과 오픈 이력을 바탕으로 매장 운영 상태와 점주 요청을 이어받습니다.'
    }
] as const satisfies readonly TeamScene[];
