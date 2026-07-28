import {
    DEFAULT_FRANCHISE_LEAD_STATUS,
    FRANCHISE_LEAD_SOURCES
} from '@/lib/franchise-leads';
import type { LeadWorkQueueKey } from '@/lib/franchise-lead-workflow';
import type {
    LeadActivityType,
    LeadDbLayer,
    LeadFormState,
    LeadViewMode,
    MetaFieldMapping,
    MetaIntegrationState
} from './types';

export const EMPTY_FORM: LeadFormState = {
    name: '',
    mobile: '',
    source: '',
    status: DEFAULT_FRANCHISE_LEAD_STATUS,
    grade: '',
    desiredRegion: '',
    budgetMin: '',
    budgetMax: '',
    interestedBrand: '',
    managerId: '',
    nextContactAt: '',
    memo: ''
};

export const ACTIVITY_TYPES = ['전화', '문자', '방문상담', '계약검토', '메모', '상태변경', '고객전환'] satisfies readonly LeadActivityType[];
export const SOURCE_FILTER_OPTIONS = ['전체', ...FRANCHISE_LEAD_SOURCES] as const;
export const RANGE_OPTIONS = ['최근 7일', '최근 30일', '최근 3개월', '전체'] as const;
export const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;

export const ENABLE_LEAD_CUSTOMER_DB_LINKING = false;

export const EMPTY_META_STATE: MetaIntegrationState = {
    connections: [],
    forms: [],
    imports: [],
    configReady: false
};

export const META_FIELD_LABELS: ReadonlyArray<{ readonly key: keyof MetaFieldMapping; readonly label: string }> = [
    { key: 'name', label: '이름' },
    { key: 'mobile', label: '연락처' },
    { key: 'desiredRegion', label: '희망 지역' },
    { key: 'budget', label: '전체 예산' },
    { key: 'budgetMin', label: '최소 예산' },
    { key: 'budgetMax', label: '최대 예산' },
    { key: 'interestedBrand', label: '관심 브랜드' },
    { key: 'memo', label: '메모' }
];

export const VIEW_OPTIONS: ReadonlyArray<{ readonly mode: LeadViewMode; readonly label: string; readonly description: string }> = [
    { mode: 'table', label: '테이블', description: '전체 필드 중심으로 확인' },
    { mode: 'pipeline', label: '파이프라인', description: '상태별 상담 흐름 관리' },
    { mode: 'tasks', label: '연락 관리', description: '우선 연락할 가맹 희망자 분류' }
];

export const WORK_QUEUE_OPTIONS: ReadonlyArray<{ readonly key: LeadWorkQueueKey; readonly label: string }> = [
    { key: 'all', label: '전체 연락' },
    { key: 'overdue', label: '연락 지연' },
    { key: 'today', label: '오늘 연락' },
    { key: 'no_response', label: '무응답 확인' }
];

export const LEAD_DB_LAYER_OPTIONS: ReadonlyArray<{ readonly key: LeadDbLayer; readonly label: string; readonly description: string }> = [
    { key: 'raw_intake', label: '1차 유입 DB', description: 'Meta/엑셀 등에서 들어온 원천 DB' },
    { key: 'candidate', label: '가맹 희망자', description: '가맹 의사가 확인되어 관리할 DB' }
];
