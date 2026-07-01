export const VENDOR_CONTRACT_CATEGORIES = [
    'logistics',
    'food_material',
    'interior',
    'marketing',
    'lease',
    'other'
] as const;

export const VENDOR_CONTRACT_STATUSES = [
    'active',
    'renewal_due',
    'expired',
    'terminated',
    'renewed',
    'archived'
] as const;

export const VENDOR_CONTRACT_DOCUMENT_SOURCES = [
    'upload',
    'electronic_contract',
    'manual'
] as const;

export type VendorContractCategory = typeof VENDOR_CONTRACT_CATEGORIES[number];
export type VendorContractStatus = typeof VENDOR_CONTRACT_STATUSES[number];
export type VendorContractDocumentSource = typeof VENDOR_CONTRACT_DOCUMENT_SOURCES[number];

export type VendorContractRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly owner_profile_id: string | null;
    readonly created_by: string | null;
    readonly category: string | null;
    readonly vendor_name: string | null;
    readonly contract_title: string | null;
    readonly contract_start_date: string | null;
    readonly contract_end_date: string | null;
    readonly status: string | null;
    readonly document_source: string | null;
    readonly electronic_contract_id: string | null;
    readonly storage_bucket: string | null;
    readonly storage_path: string | null;
    readonly file_name: string | null;
    readonly memo: string | null;
    readonly data: unknown;
    readonly created_at: string | null;
    readonly updated_at: string | null;
};

export type VendorContractView = {
    readonly id: string;
    readonly companyId: string;
    readonly ownerProfileId: string;
    readonly createdBy: string;
    readonly category: VendorContractCategory;
    readonly categoryLabel: string;
    readonly vendorName: string;
    readonly contractTitle: string;
    readonly contractStartDate: string;
    readonly contractEndDate: string;
    readonly status: VendorContractStatus;
    readonly statusLabel: string;
    readonly remainingDays: number | null;
    readonly ddayLabel: string;
    readonly documentSource: VendorContractDocumentSource;
    readonly electronicContractId: string;
    readonly storageBucket: string;
    readonly storagePath: string;
    readonly fileName: string;
    readonly memo: string;
    readonly createdAt: string;
    readonly updatedAt: string;
};

type StatusInput = {
    readonly contractEndDate?: string | null;
    readonly explicitStatus?: string | null;
};

const CATEGORY_LABELS: Readonly<Record<VendorContractCategory, string>> = {
    logistics: '물류',
    food_material: '식자재',
    interior: '인테리어/시공',
    marketing: '마케팅',
    lease: '임대차',
    other: '기타'
};

const STATUS_LABELS: Readonly<Record<VendorContractStatus, string>> = {
    active: '진행중',
    renewal_due: '만료예정',
    expired: '만료',
    terminated: '해지',
    renewed: '갱신완료',
    archived: '보관'
};

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function isVendorContractCategory(value: string): value is VendorContractCategory {
    return VENDOR_CONTRACT_CATEGORIES.some(category => category === value);
}

function isVendorContractStatus(value: string): value is VendorContractStatus {
    return VENDOR_CONTRACT_STATUSES.some(status => status === value);
}

function isVendorContractDocumentSource(value: string): value is VendorContractDocumentSource {
    return VENDOR_CONTRACT_DOCUMENT_SOURCES.some(source => source === value);
}

function startOfLocalDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function normalizeVendorContractCategory(value: unknown): VendorContractCategory {
    const normalized = cleanString(value);
    return isVendorContractCategory(normalized) ? normalized : 'other';
}

export function normalizeVendorContractDocumentSource(value: unknown): VendorContractDocumentSource {
    const normalized = cleanString(value);
    return isVendorContractDocumentSource(normalized) ? normalized : 'manual';
}

export function categoryLabel(category: VendorContractCategory): string {
    return CATEGORY_LABELS[category];
}

export function statusLabel(status: VendorContractStatus): string {
    return STATUS_LABELS[status];
}

export function daysUntilDate(value: string | null | undefined, now: Date = new Date()): number | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    const diffMs = startOfLocalDay(parsed).getTime() - startOfLocalDay(now).getTime();
    return Math.ceil(diffMs / 86_400_000);
}

export function deriveVendorContractStatus(input: StatusInput, now: Date = new Date()): VendorContractStatus {
    const explicitStatus = cleanString(input.explicitStatus);
    if (explicitStatus === 'terminated' || explicitStatus === 'renewed' || explicitStatus === 'archived') {
        return explicitStatus;
    }

    const remainingDays = daysUntilDate(input.contractEndDate, now);
    if (remainingDays === null) return 'active';
    if (remainingDays < 0) return 'expired';
    if (remainingDays <= 30) return 'renewal_due';
    return isVendorContractStatus(explicitStatus) ? explicitStatus : 'active';
}

export function vendorContractDdayLabel(remainingDays: number | null): string {
    if (remainingDays === null) return '-';
    if (remainingDays === 0) return 'D-Day';
    if (remainingDays > 0) return `D-${remainingDays}`;
    return `D+${Math.abs(remainingDays)}`;
}

export function toVendorContractView(row: VendorContractRow, now: Date = new Date()): VendorContractView {
    const category = normalizeVendorContractCategory(row.category);
    const status = deriveVendorContractStatus({
        contractEndDate: row.contract_end_date,
        explicitStatus: row.status
    }, now);
    const remainingDays = daysUntilDate(row.contract_end_date, now);
    const documentSource = normalizeVendorContractDocumentSource(row.document_source);

    return {
        id: row.id,
        companyId: row.company_id || '',
        ownerProfileId: row.owner_profile_id || '',
        createdBy: row.created_by || '',
        category,
        categoryLabel: categoryLabel(category),
        vendorName: row.vendor_name || '',
        contractTitle: row.contract_title || '',
        contractStartDate: row.contract_start_date || '',
        contractEndDate: row.contract_end_date || '',
        status,
        statusLabel: statusLabel(status),
        remainingDays,
        ddayLabel: vendorContractDdayLabel(remainingDays),
        documentSource,
        electronicContractId: row.electronic_contract_id || '',
        storageBucket: row.storage_bucket || '',
        storagePath: row.storage_path || '',
        fileName: row.file_name || '',
        memo: row.memo || '',
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || ''
    };
}
