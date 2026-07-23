import type { LeadTableColumnKey, LeadTableFilters } from './leadTableTypes';
import type { LeadTableSortKey } from './leadTableTypes';
import { ENABLE_LEAD_CUSTOMER_DB_LINKING } from './constants';

export const LEAD_TABLE_COLUMNS_STORAGE_KEY = 'franchiseLeadTableColumns';
export const LEAD_TABLE_CHECKBOX_COLUMN_WIDTH = 40;

export const LEAD_TABLE_COLUMN_WIDTHS = {
    priority: 56,
    name: 144,
    mobile: 136,
    status: 112,
    disclosure: 120,
    manager: 120,
    source: 104,
    desiredRegion: 120,
    budget: 120,
    interestedBrand: 120,
    nextContactAt: 144,
    memo: 224,
    links: 88,
    actions: 176
} as const satisfies Readonly<Record<LeadTableColumnKey, number>>;

type LeadTableColumnConfig = {
    readonly key: LeadTableColumnKey;
    readonly label: string;
    readonly defaultVisible: boolean;
    readonly required?: boolean;
};

export const EMPTY_LEAD_TABLE_FILTERS: LeadTableFilters = {
    regionQuery: '',
    budgetMin: '',
    budgetMax: ''
};

export const LEAD_TABLE_SORT_OPTIONS: ReadonlyArray<{ readonly key: LeadTableSortKey; readonly label: string }> = [
    { key: 'created_desc', label: '최신 등록순' },
    { key: 'created_asc', label: '오래된 등록순' },
    { key: 'budget_asc', label: '예산 낮은순' },
    { key: 'budget_desc', label: '예산 높은순' },
    { key: 'priority_only', label: '중요 희망자만 보기' },
    { key: 'disclosure_action', label: '정보공개서 필요순' },
    { key: 'disclosure_recent', label: '정보공개서 최근 발송순' },
    { key: 'disclosure_eligible', label: '계약 가능일 빠른순' }
] as const;

const CUSTOMER_DB_LINK_COLUMNS = [
    { key: 'links', label: '연결', defaultVisible: false }
] satisfies readonly LeadTableColumnConfig[];

export const LEAD_TABLE_COLUMNS: readonly LeadTableColumnConfig[] = [
    { key: 'priority', label: '중요', defaultVisible: true },
    { key: 'name', label: '가맹 희망자', defaultVisible: true, required: true },
    { key: 'mobile', label: '연락처', defaultVisible: true },
    { key: 'status', label: '상태', defaultVisible: true },
    { key: 'disclosure', label: '정보공개서', defaultVisible: true },
    { key: 'manager', label: '담당자', defaultVisible: true },
    { key: 'source', label: '유입', defaultVisible: true },
    { key: 'desiredRegion', label: '희망지역', defaultVisible: true },
    { key: 'budget', label: '예산', defaultVisible: true },
    { key: 'interestedBrand', label: '브랜드', defaultVisible: false },
    { key: 'nextContactAt', label: '다음 연락', defaultVisible: true },
    { key: 'memo', label: '메모', defaultVisible: false },
    ...(ENABLE_LEAD_CUSTOMER_DB_LINKING ? CUSTOMER_DB_LINK_COLUMNS : []),
    { key: 'actions', label: '관리', defaultVisible: true }
];

export const DEFAULT_LEAD_TABLE_COLUMN_KEYS = LEAD_TABLE_COLUMNS
    .filter(column => column.defaultVisible)
    .map(column => column.key);

export function isLeadTableColumnKey(value: string): value is LeadTableColumnKey {
    return LEAD_TABLE_COLUMNS.some(column => column.key === value);
}

export function normalizeLeadTableColumnKeys(values: readonly string[]): readonly LeadTableColumnKey[] {
    const selected = new Set(values.filter(isLeadTableColumnKey));
    const normalized = LEAD_TABLE_COLUMNS
        .filter(column => selected.has(column.key))
        .map(column => column.key);

    return normalized.length > 0 ? normalized : DEFAULT_LEAD_TABLE_COLUMN_KEYS;
}

export function toggleLeadTableColumn(
    currentColumns: readonly LeadTableColumnKey[],
    columnKey: LeadTableColumnKey
): readonly LeadTableColumnKey[] {
    const column = LEAD_TABLE_COLUMNS.find(item => item.key === columnKey);
    if (!column) return currentColumns;

    const selected = new Set(currentColumns);
    if (selected.has(columnKey)) {
        if (column.required || selected.size <= 1) return currentColumns;
        selected.delete(columnKey);
    } else {
        selected.add(columnKey);
    }

    return LEAD_TABLE_COLUMNS
        .filter(item => selected.has(item.key))
        .map(item => item.key);
}

export function hasActiveLeadTableFilters(filters: LeadTableFilters): boolean {
    return Boolean(filters.regionQuery.trim() || filters.budgetMin.trim() || filters.budgetMax.trim());
}
