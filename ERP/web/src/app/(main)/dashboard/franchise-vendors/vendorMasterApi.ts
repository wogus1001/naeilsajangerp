import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import type { FranchiseVendorCategory, FranchiseVendorStatus, FranchiseVendorView } from '@/lib/franchise-vendors';

export type VendorMasterForm = {
    readonly businessNumber: string;
    readonly category: FranchiseVendorCategory;
    readonly contactEmail: string;
    readonly contactName: string;
    readonly contactPhone: string;
    readonly id: string;
    readonly memo: string;
    readonly status: FranchiseVendorStatus;
    readonly vendorName: string;
};

export type VendorMastersResponse = {
    readonly schemaReady?: boolean;
    readonly vendors?: readonly FranchiseVendorView[];
};

export const EMPTY_VENDOR_MASTER_FORM: VendorMasterForm = {
    businessNumber: '',
    category: 'other',
    contactEmail: '',
    contactName: '',
    contactPhone: '',
    id: '',
    memo: '',
    status: 'active',
    vendorName: ''
};

export async function fetchVendorMasters(companyId: string): Promise<{
    readonly schemaReady: boolean;
    readonly vendors: readonly FranchiseVendorView[];
}> {
    const params = new URLSearchParams({ status: 'all' });
    if (companyId) params.set('companyId', companyId);
    const response = await fetch(`/api/franchise-vendors?${params.toString()}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    const data = unwrapApiData<VendorMastersResponse>(payload);
    return {
        schemaReady: data.schemaReady !== false,
        vendors: data.vendors || []
    };
}

export async function saveVendorMaster(companyId: string, form: VendorMasterForm): Promise<FranchiseVendorView> {
    const response = await fetch('/api/franchise-vendors', {
        body: JSON.stringify({ ...form, companyId }),
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        method: form.id ? 'PATCH' : 'POST'
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<{ readonly vendor: FranchiseVendorView }>(payload).vendor;
}

export function formFromVendorMaster(vendor: FranchiseVendorView): VendorMasterForm {
    return {
        businessNumber: vendor.businessNumber,
        category: vendor.category,
        contactEmail: vendor.contactEmail,
        contactName: vendor.contactName,
        contactPhone: vendor.contactPhone,
        id: vendor.id,
        memo: vendor.memo,
        status: vendor.status,
        vendorName: vendor.vendorName
    };
}
