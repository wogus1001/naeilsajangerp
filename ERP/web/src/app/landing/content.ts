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
        title: 'Franchise OS',
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
        situation: '광고, 박람회, 소개, 전화 문의와 Meta Lead Ads 유입을 같은 기준으로 정리합니다.',
        capabilities: ['Meta Lead Ads 유입 연동', '유입 경로와 담당자 기준 분류', '상담 상태와 다음 연락일 관리'],
        outcome: '가맹개발팀이 오늘 처리할 DB와 다음 액션을 한 화면에서 확인합니다.',
        mock: {
            kind: 'table',
            headers: ['이름', '유입', '상태'],
            rows: [
                ['김민준', 'Meta 광고', '상담중'],
                ['박서연', '박람회', '계약예정'],
                ['이도윤', '소개', '입지검토']
            ]
        }
    },
    {
        title: '출점 후보지',
        situation: '후보자가 원하는 지역과 외부 상가 데이터를 분리해서 보고 필요한 물건지만 연결합니다.',
        capabilities: ['희망지역과 후보지 연결', '외부 상가 저장 목록 관리', '중복 연결과 삭제 이력 확인'],
        outcome: '출점개발팀이 상담 중인 후보와 검토 가능한 상권을 한 화면에서 확인합니다.',
        mock: {
            kind: 'chips',
            items: ['서울 송파구', '대전 유성구', '부산 해운대구', '외부 상가 연결']
        }
    },
    {
        title: '정보공개서/계약',
        situation: '계약 전 정보공개서 발송 기록과 14일 대기 기준을 놓치지 않게 관리합니다.',
        capabilities: ['정보공개서 발송 기록', '계약 가능일 자동 확인', '계약 전 체크리스트 점검'],
        outcome: '계약 담당자가 법정 대기 기간과 준비 항목을 한 번에 확인합니다.',
        mock: {
            kind: 'checklist',
            items: ['정보공개서 수령 확인', '계약 가능일 확인', '계약 서류 준비']
        }
    },
    {
        title: '오픈 준비',
        situation: '계약 이후 점주와 담당 업무가 흩어지지 않도록 오픈 준비를 단계별로 봅니다.',
        capabilities: ['오픈 전 체크리스트', '담당 업무와 완료 상태', '지연 항목 우선 확인'],
        outcome: '오픈 담당자가 준비 현황과 병목 구간을 빠르게 공유합니다.',
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
        title: '가맹 운영',
        situation: '오픈 이후 매장 상태와 본사 후속 업무를 같은 운영 흐름으로 이어갑니다.',
        capabilities: ['매장 운영 상태 확인', '본사 후속 조치 기록', '점주별 커뮤니케이션 이력'],
        outcome: '운영팀이 오픈 이후의 이슈와 후속 업무를 놓치지 않습니다.',
        mock: {
            kind: 'chips',
            items: ['운영중', '후속 확인', '점주 요청', '본사 조치']
        }
    }
] as const satisfies readonly FeatureDetail[];

export const TEAM_SCENES = [
    {
        team: '가맹개발팀',
        title: '유입 DB를 상담 대상으로 정리',
        description: '광고와 박람회 유입을 같은 기준으로 보고 담당자별 다음 연락을 잡습니다.'
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
