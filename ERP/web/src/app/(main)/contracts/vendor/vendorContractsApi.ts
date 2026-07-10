import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import type { FranchiseVendorView } from '@/lib/franchise-vendors';
import {
    buildContractPayload,
    uploadVendorContractFile
} from './vendorContractsClient';
import {
    parseUserOptions,
    type ElectronicContractOption,
    type ElectronicContractsResponse,
    type UserOption,
    type VendorContract,
    type VendorContractActionResponse,
    type VendorContractEvent,
    type VendorContractEventsResponse,
    type VendorContractForm,
    type VendorContractsResponse
} from './vendorContractsModel';

type ContractsQuery = {
    readonly category: string;
    readonly companyId: string;
    readonly q: string;
    readonly status: string;
};

type SaveContractInput = {
    readonly companyId: string;
    readonly file: File | null;
    readonly form: VendorContractForm;
    readonly isEditing: boolean;
};

type SaveContractResult = {
    readonly message: string;
};

type OptionsResult = {
    readonly electronicContracts: readonly ElectronicContractOption[];
    readonly users: readonly UserOption[];
    readonly vendorSchemaReady: boolean;
    readonly vendorMasters: readonly FranchiseVendorView[];
};

type VendorMastersResponse = {
    readonly schemaReady?: boolean;
    readonly vendors?: readonly FranchiseVendorView[];
};

type ContractsResult = {
    readonly contracts: readonly VendorContract[];
    readonly schemaReady: boolean;
};

export async function fetchVendorContracts(query: ContractsQuery): Promise<ContractsResult> {
    const params = new URLSearchParams({
        category: query.category,
        q: query.q,
        status: query.status
    });
    if (query.companyId) params.set('companyId', query.companyId);
    const response = await fetch(`/api/franchise-vendor-contracts?${params.toString()}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    const data = unwrapApiData<VendorContractsResponse>(payload);
    return {
        contracts: data.contracts || [],
        schemaReady: data.schemaReady !== false
    };
}

export async function fetchVendorContractOptions(companyName: string, companyId: string): Promise<OptionsResult> {
    const headers = await getApiAuthHeaders();
    const vendorParams = new URLSearchParams({ status: 'active' });
    if (companyId) vendorParams.set('companyId', companyId);
    const [contractResponse, userResponse, vendorResponse] = await Promise.all([
        fetch('/api/electronic-contracts?scope=company', { cache: 'no-store', headers }),
        companyName
            ? fetch(`/api/users?company=${encodeURIComponent(companyName)}`, { cache: 'no-store', headers })
            : Promise.resolve(null),
        fetch(`/api/franchise-vendors?${vendorParams.toString()}`, { cache: 'no-store', headers })
    ]);
    const electronicContracts = contractResponse.ok
        ? unwrapApiData<ElectronicContractsResponse>(await contractResponse.json()).contracts || []
        : [];
    const users = userResponse?.ok
        ? parseUserOptions(await userResponse.json())
        : [];
    const vendorData = vendorResponse.ok
        ? unwrapApiData<VendorMastersResponse>(await vendorResponse.json())
        : { schemaReady: false, vendors: [] };
    return {
        electronicContracts,
        users,
        vendorMasters: vendorData.vendors || [],
        vendorSchemaReady: vendorData.schemaReady !== false
    };
}

export async function fetchVendorContractEvents(contractId: string): Promise<readonly VendorContractEvent[]> {
    if (!contractId) return [];
    const response = await fetch(`/api/franchise-vendor-contracts/actions?contractId=${encodeURIComponent(contractId)}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    const data = unwrapApiData<VendorContractEventsResponse>(payload);
    return data.events || [];
}

export async function saveVendorContract(input: SaveContractInput): Promise<SaveContractResult> {
    const contractId = input.form.id || crypto.randomUUID();
    const uploadFields = input.file
        ? await uploadVendorContractFile({ companyId: input.companyId, contractId, file: input.file })
        : {};
    const nextForm = {
        ...input.form,
        ...uploadFields,
        documentSource: input.file ? 'upload' as const : input.form.documentSource,
        id: contractId
    };
    const response = await fetch('/api/franchise-vendor-contracts', {
        body: JSON.stringify(buildContractPayload(nextForm, input.companyId)),
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        method: input.isEditing ? 'PATCH' : 'POST'
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    return { message: input.isEditing ? '수정했습니다.' : '등록했습니다.' };
}

export async function deleteVendorContract(contractId: string): Promise<void> {
    const response = await fetch(`/api/franchise-vendor-contracts?id=${encodeURIComponent(contractId)}`, {
        headers: await getApiAuthHeaders(),
        method: 'DELETE'
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
}

export async function runVendorContractAction(body: Record<string, string>): Promise<VendorContractActionResponse> {
    const response = await fetch('/api/franchise-vendor-contracts/actions', {
        body: JSON.stringify(body),
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        method: 'POST'
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<VendorContractActionResponse>(payload);
}

export async function openVendorContractUpload(contractId: string): Promise<void> {
    const response = await fetch(`/api/franchise-vendor-contracts?action=open&id=${encodeURIComponent(contractId)}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    const data = unwrapApiData<{ readonly url?: string }>(payload);
    if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer');
}
