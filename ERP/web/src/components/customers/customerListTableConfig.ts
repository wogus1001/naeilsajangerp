export type CustomerWorkHistoryItem = {
    readonly date?: string;
    readonly content?: string;
};

export type CustomerListRecord = {
    readonly id: string;
    readonly companyId?: string;
    readonly companyName?: string;
    readonly name: string;
    readonly grade: string;
    readonly gender: 'M' | 'F';
    readonly class: string;
    readonly status: string;
    readonly feature: string;
    readonly address: string;
    readonly mobile: string;
    readonly companyPhone: string;
    readonly wantedDepositMin: string;
    readonly wantedDepositMax: string;
    readonly wantedRentMin: string;
    readonly wantedRentMax: string;
    readonly wantedItem: string;
    readonly wantedIndustry: string;
    readonly wantedArea: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly managerId: string;
    readonly manager_id?: string;
    readonly isFavorite?: boolean;
    readonly memoInterest?: string;
    readonly memoHistory?: string;
    readonly history?: readonly CustomerWorkHistoryItem[];
};

export type CustomerListColumnKey =
    | 'no'
    | 'name'
    | 'grade'
    | 'gender'
    | 'class'
    | 'status'
    | 'feature'
    | 'address'
    | 'mobile'
    | 'companyPhone'
    | 'deposit'
    | 'rent'
    | 'wantedItem'
    | 'wantedIndustry'
    | 'wantedArea'
    | 'createdAt'
    | 'manager'
    | 'latestWorkDate'
    | 'latestWorkContent';

export type CustomerListRenderedColumnKey = CustomerListColumnKey | 'star';

export type CustomerColumnPreferences = {
    readonly order: readonly CustomerListColumnKey[];
    readonly visible: readonly CustomerListColumnKey[];
};

export type CustomerListSortConfig = {
    readonly key: CustomerListColumnKey;
    readonly direction: 'asc' | 'desc';
};

type CustomerListColumnConfig = {
    readonly key: CustomerListColumnKey;
    readonly label: string;
    readonly defaultVisible: boolean;
    readonly required?: boolean;
};

export const CUSTOMER_COLUMN_PREFERENCES_STORAGE_KEY = 'customerListColumnPreferencesV1';

export const CUSTOMER_LIST_COLUMNS: readonly CustomerListColumnConfig[] = [
    { key: 'no', label: 'No', defaultVisible: true },
    { key: 'name', label: '고객명', defaultVisible: true, required: true },
    { key: 'grade', label: '등급', defaultVisible: true },
    { key: 'gender', label: '성별', defaultVisible: true },
    { key: 'class', label: '분류', defaultVisible: true },
    { key: 'status', label: '진행상태', defaultVisible: true },
    { key: 'feature', label: '특징', defaultVisible: true },
    { key: 'address', label: '주소', defaultVisible: true },
    { key: 'mobile', label: '핸드폰', defaultVisible: true },
    { key: 'companyPhone', label: '회사전화', defaultVisible: true },
    { key: 'deposit', label: '보증금', defaultVisible: true },
    { key: 'rent', label: '월세', defaultVisible: true },
    { key: 'wantedItem', label: '찾는물건', defaultVisible: true },
    { key: 'wantedIndustry', label: '찾는업종', defaultVisible: true },
    { key: 'wantedArea', label: '찾는지역', defaultVisible: true },
    { key: 'createdAt', label: '등록일', defaultVisible: true },
    { key: 'manager', label: '담당자', defaultVisible: true },
    { key: 'latestWorkDate', label: '작업 날짜', defaultVisible: true },
    { key: 'latestWorkContent', label: '작업 내역', defaultVisible: true }
];

export const CUSTOMER_LIST_COLUMN_WIDTHS = {
    no: 40,
    name: 104,
    grade: 64,
    gender: 40,
    class: 88,
    status: 80,
    feature: 200,
    address: 300,
    mobile: 120,
    companyPhone: 120,
    deposit: 104,
    rent: 104,
    wantedItem: 80,
    wantedIndustry: 80,
    wantedArea: 80,
    createdAt: 120,
    manager: 88,
    latestWorkDate: 120,
    latestWorkContent: 240
} as const satisfies Readonly<Record<CustomerListColumnKey, number>>;

export const DEFAULT_CUSTOMER_COLUMN_PREFERENCES: CustomerColumnPreferences = {
    order: CUSTOMER_LIST_COLUMNS.map(column => column.key),
    visible: CUSTOMER_LIST_COLUMNS
        .filter(column => column.defaultVisible)
        .map(column => column.key)
};

export function getLatestCustomerWork(
    history: readonly CustomerWorkHistoryItem[]
): Readonly<{ date: string; content: string }> {
    const latest = history.reduce<CustomerWorkHistoryItem | undefined>((current, item) => {
        if (!current) return item;
        return (item.date ?? '') > (current.date ?? '') ? item : current;
    }, undefined);

    return {
        date: latest?.date?.trim() || '-',
        content: latest?.content?.trim() || '-'
    };
}

export function isCustomerListColumnKey(value: unknown): value is CustomerListColumnKey {
    return typeof value === 'string'
        && CUSTOMER_LIST_COLUMNS.some(column => column.key === value);
}

export function normalizeCustomerColumnPreferences(value: unknown): CustomerColumnPreferences {
    const savedOrder = isPreferenceRecord(value) && Array.isArray(value.order)
        ? value.order.filter(isCustomerListColumnKey)
        : [];
    const uniqueOrder = Array.from(new Set(savedOrder));
    const order = [
        ...uniqueOrder,
        ...DEFAULT_CUSTOMER_COLUMN_PREFERENCES.order.filter(key => !uniqueOrder.includes(key))
    ];
    const savedVisible = isPreferenceRecord(value) && Array.isArray(value.visible)
        ? value.visible.filter(isCustomerListColumnKey)
        : DEFAULT_CUSTOMER_COLUMN_PREFERENCES.visible;
    const visible = new Set(savedVisible);

    for (const column of CUSTOMER_LIST_COLUMNS) {
        if (column.required) visible.add(column.key);
    }

    return {
        order,
        visible: order.filter(key => visible.has(key))
    };
}

export function parseCustomerColumnPreferences(serialized: string | null): CustomerColumnPreferences {
    if (!serialized) return DEFAULT_CUSTOMER_COLUMN_PREFERENCES;

    try {
        return normalizeCustomerColumnPreferences(JSON.parse(serialized));
    } catch (error) {
        if (error instanceof SyntaxError) return DEFAULT_CUSTOMER_COLUMN_PREFERENCES;
        throw error;
    }
}

export function getCustomerListRenderedColumns(
    preferences: CustomerColumnPreferences
): readonly CustomerListRenderedColumnKey[] {
    return [
        'star',
        ...preferences.order.filter(key => preferences.visible.includes(key))
    ];
}

export function toggleCustomerListColumn(
    preferences: CustomerColumnPreferences,
    key: CustomerListColumnKey
): CustomerColumnPreferences {
    const column = CUSTOMER_LIST_COLUMNS.find(item => item.key === key);
    if (!column || column.required) return preferences;

    const visible = new Set(preferences.visible);
    if (visible.has(key)) visible.delete(key);
    else visible.add(key);

    return {
        ...preferences,
        visible: preferences.order.filter(columnKey => visible.has(columnKey))
    };
}

export function moveCustomerListColumn(
    preferences: CustomerColumnPreferences,
    key: CustomerListColumnKey,
    direction: 'up' | 'down'
): CustomerColumnPreferences {
    const currentIndex = preferences.order.indexOf(key);
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= preferences.order.length) {
        return preferences;
    }

    const order = [...preferences.order];
    order[currentIndex] = order[nextIndex];
    order[nextIndex] = key;

    return {
        ...preferences,
        order,
        visible: order.filter(columnKey => preferences.visible.includes(columnKey))
    };
}

export function reorderCustomerListColumns(
    preferences: CustomerColumnPreferences,
    sourceKey: CustomerListColumnKey,
    targetKey: CustomerListColumnKey
): CustomerColumnPreferences {
    const sourceIndex = preferences.order.indexOf(sourceKey);
    const targetIndex = preferences.order.indexOf(targetKey);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return preferences;
    }

    const order = preferences.order.filter(key => key !== sourceKey);
    const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    order.splice(insertionIndex, 0, sourceKey);

    return {
        ...preferences,
        order,
        visible: order.filter(key => preferences.visible.includes(key))
    };
}

function isPreferenceRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
