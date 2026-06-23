export type ContractStoreFormLeadInput = {
    readonly name: string;
    readonly interestedBrand: string;
    readonly desiredRegion: string;
};

export type ContractStoreFormLocationInput = {
    readonly name?: string | null;
    readonly brand?: string | null;
    readonly status?: string | null;
    readonly region?: string | null;
    readonly address?: string | null;
    readonly latitude?: number | null;
    readonly longitude?: number | null;
    readonly openedAt?: string | null;
    readonly memo?: string | null;
};

export type ContractStoreFormSourceInput = {
    readonly title?: string | null;
    readonly region?: string | null;
    readonly address?: string | null;
    readonly latitude?: number | null;
    readonly longitude?: number | null;
};

export type ContractStoreFormState = {
    readonly name: string;
    readonly brand: string;
    readonly status: string;
    readonly region: string;
    readonly address: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly openedAt: string;
    readonly memo: string;
};

const STORE_STATUSES = ['오픈준비', '운영중', '휴점', '폐점'] as const;

export function readContractStoreFormStatus(value: string): string {
    return STORE_STATUSES.find(status => status === value) || '오픈준비';
}

export function buildContractStoreFormState(
    lead: ContractStoreFormLeadInput,
    location?: ContractStoreFormLocationInput | null,
    source?: ContractStoreFormSourceInput | null
): ContractStoreFormState {
    return {
        name: location?.name || source?.title || `${lead.name} 가맹점`,
        brand: location?.brand || lead.interestedBrand || '',
        status: readContractStoreFormStatus(location?.status || '오픈준비'),
        region: location?.region || source?.region || lead.desiredRegion || '',
        address: location?.address || source?.address || '',
        latitude: location?.latitude ?? source?.latitude ?? null,
        longitude: location?.longitude ?? source?.longitude ?? null,
        openedAt: location?.openedAt || '',
        memo: location?.memo || `${lead.name} 계약 완료 후 오픈준비 전환`
    };
}
