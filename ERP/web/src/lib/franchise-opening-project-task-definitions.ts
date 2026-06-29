export const OPENING_PROJECT_TASK_GROUPS = [
    {
        id: 'contract-admin',
        label: '계약/행정',
        description: '계약 완료 후 오픈 전까지 필요한 행정 서류와 본사 확인 항목입니다.',
        tasks: [
            { id: 'contract', label: '계약 최종본 확인', description: '전자계약 완료본과 특약 원본을 확인합니다.', required: true },
            { id: 'business-registration', label: '사업자등록증/영업신고증', description: '일반음식점 영업을 위한 필수 등록증을 확보합니다.', required: true },
            { id: 'settlement-account', label: '정산계좌/POS 정보', description: '정산 계좌와 POS 개통 정보를 본사에 공유합니다.', required: true },
            { id: 'hygiene-insurance', label: '위생교육/보험 확인', description: '위생교육, 보험 등 운영 전 필수 확인사항을 정리합니다.', required: false }
        ]
    },
    {
        id: 'interior',
        label: '인테리어',
        description: '실측부터 준공 확인까지 오픈 일정에 직접 영향을 주는 공정입니다.',
        tasks: [
            { id: 'interior', label: '도면/견적 확정', description: '확정 도면, 견적, 공사 범위를 점주와 확인합니다.', required: true },
            { id: 'site-measurement', label: '실측/공사 범위 확인', description: '현장 실측 결과와 공사 제외/포함 범위를 맞춥니다.', required: true },
            { id: 'construction-start', label: '공사 착수/일정 공유', description: '착공일, 주요 공정, 예상 준공일을 공유합니다.', required: true },
            { id: 'signage-equipment', label: '간판/집기 설치', description: '간판, 주방기기, 필수 집기 설치 일정을 확인합니다.', required: true },
            { id: 'completion-check', label: '준공/하자 체크', description: '준공 상태와 오픈 전 보완 필요사항을 점검합니다.', required: true }
        ]
    },
    {
        id: 'training',
        label: '교육',
        description: '점주와 매장 인력이 실제 운영을 시작할 수 있는지 확인합니다.',
        tasks: [
            { id: 'training', label: '점주 교육 일정 확정', description: '본사 교육 일정과 참석자를 확정합니다.', required: true },
            { id: 'recipe-training', label: '레시피/품질 교육', description: '핵심 메뉴 제조와 품질 기준을 교육합니다.', required: true },
            { id: 'pos-training', label: 'POS/정산 교육', description: '주문, 정산, 마감 처리 흐름을 교육합니다.', required: true },
            { id: 'operation-manual', label: '운영 매뉴얼 전달', description: '오픈 전 운영 매뉴얼과 체크 기준을 전달합니다.', required: false }
        ]
    },
    {
        id: 'initial-stock',
        label: '초도물류',
        description: '초도 발주, 입고, 설비 상태를 오픈 전까지 맞춥니다.',
        tasks: [
            { id: 'initial-stock', label: '초도 발주 확정', description: '필수 초도 품목과 발주 수량을 확정합니다.', required: true },
            { id: 'inbound-date', label: '물류 입고일 확정', description: '초도 물류 입고일과 수령 담당자를 확인합니다.', required: true },
            { id: 'cold-storage', label: '냉장/냉동 설비 확인', description: '입고 전 냉장/냉동 설비 가동 상태를 확인합니다.', required: true },
            { id: 'missing-items', label: '누락 품목 확인', description: '오픈 전 누락 품목과 추가 발주 필요 여부를 확인합니다.', required: false }
        ]
    },
    {
        id: 'promotion',
        label: '홍보',
        description: '지도, 배달앱, 오픈 이벤트처럼 초기 고객 유입에 필요한 준비입니다.',
        tasks: [
            { id: 'promotion', label: '오픈 홍보 계획', description: '오픈 전후 홍보 일정과 지원 범위를 정합니다.', required: false },
            { id: 'place-registration', label: '네이버/카카오 장소 등록', description: '지도 검색 노출에 필요한 장소 정보를 등록합니다.', required: true },
            { id: 'delivery-apps', label: '배달앱 입점 등록', description: '배달앱 입점과 메뉴/가격 정보를 확인합니다.', required: false },
            { id: 'opening-event', label: '오픈 이벤트/쿠폰', description: '오픈 프로모션, 쿠폰, 안내물 준비 상태를 확인합니다.', required: false }
        ]
    },
    {
        id: 'open-date',
        label: '오픈일',
        description: '가오픈, 본오픈, 첫 점검까지 오픈 당일 전후 실행 항목입니다.',
        tasks: [
            { id: 'open-date', label: '본오픈일 확정', description: '본오픈 일자와 본사 지원 인력을 확정합니다.', required: true },
            { id: 'soft-opening', label: '가오픈 점검', description: '가오픈 운영 결과와 보완사항을 정리합니다.', required: false },
            { id: 'first-inspection', label: '첫 점검 일정', description: '오픈 후 첫 현장 점검 일정을 잡습니다.', required: true },
            { id: 'opening-issue-log', label: '오픈 후 이슈 기록', description: '오픈 직후 발생 이슈와 조치 내역을 남깁니다.', required: false }
        ]
    }
] as const;
