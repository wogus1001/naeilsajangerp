export type FranchiseVendorStatus = 'active' | 'inactive';
export type FranchiseVendorCategory = 'logistics' | 'food_material' | 'interior' | 'marketing' | 'lease' | 'other';

export type FranchiseVendorRow = {
    readonly id: string;
    readonly company_id: string;
    readonly category: FranchiseVendorCategory;
    readonly vendor_name: string;
    readonly contact_name: string | null;
    readonly contact_phone: string | null;
    readonly contact_email: string | null;
    readonly business_number: string | null;
    readonly status: FranchiseVendorStatus;
    readonly memo: string | null;
    readonly data: Record<string, unknown> | null;
    readonly created_by: string | null;
    readonly updated_by: string | null;
    readonly created_at: string;
    readonly updated_at: string;
};

export type FranchiseVendorView = {
    readonly id: string;
    readonly companyId: string;
    readonly category: FranchiseVendorCategory;
    readonly categoryLabel: string;
    readonly vendorName: string;
    readonly contactName: string;
    readonly contactPhone: string;
    readonly contactEmail: string;
    readonly businessNumber: string;
    readonly status: FranchiseVendorStatus;
    readonly statusLabel: string;
    readonly memo: string;
    readonly createdBy: string;
    readonly updatedBy: string;
    readonly createdAt: string;
    readonly updatedAt: string;
};

const CATEGORY_LABELS: Record<FranchiseVendorCategory, string> = {
    food_material: '식자재',
    interior: '인테리어/시공',
    lease: '임대차',
    logistics: '물류',
    marketing: '마케팅',
    other: '기타'
};

export function franchiseVendorCategoryLabel(category: string | null | undefined): string {
    switch (category) {
        case 'food_material':
            return CATEGORY_LABELS.food_material;
        case 'interior':
            return CATEGORY_LABELS.interior;
        case 'lease':
            return CATEGORY_LABELS.lease;
        case 'logistics':
            return CATEGORY_LABELS.logistics;
        case 'marketing':
            return CATEGORY_LABELS.marketing;
        default:
            return CATEGORY_LABELS.other;
    }
}

export function toFranchiseVendorView(row: FranchiseVendorRow): FranchiseVendorView {
    return {
        businessNumber: row.business_number || '',
        category: row.category,
        categoryLabel: franchiseVendorCategoryLabel(row.category),
        companyId: row.company_id,
        contactEmail: row.contact_email || '',
        contactName: row.contact_name || '',
        contactPhone: row.contact_phone || '',
        createdAt: row.created_at,
        createdBy: row.created_by || '',
        id: row.id,
        memo: row.memo || '',
        status: row.status,
        statusLabel: row.status === 'inactive' ? '거래 중지' : '거래중',
        updatedAt: row.updated_at,
        updatedBy: row.updated_by || '',
        vendorName: row.vendor_name || ''
    };
}
