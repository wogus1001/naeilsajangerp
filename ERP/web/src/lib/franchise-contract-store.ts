import { normalizeRegion } from './franchise-market-insights';

export const CONTRACT_STORE_SOURCE_TYPES = ['franchise_location', 'external_property_listing', 'direct'] as const;

export type ContractStoreSourceType = typeof CONTRACT_STORE_SOURCE_TYPES[number];

export type ContractStoreLeadInput = {
    readonly id: string;
    readonly companyId: string;
    readonly managerId: string | null;
    readonly name: string;
    readonly mobile: string;
    readonly status: string;
    readonly interestedBrand: string;
    readonly desiredRegion: string;
    readonly budgetMin: number | null;
    readonly budgetMax: number | null;
};

export type ContractStoreSourceInput = {
    readonly id: string;
    readonly sourceType: Exclude<ContractStoreSourceType, 'direct'>;
    readonly name: string;
    readonly title?: string;
    readonly locationType?: string | null;
    readonly brand?: string | null;
    readonly status?: string | null;
    readonly region?: string | null;
    readonly address?: string | null;
    readonly latitude?: number | null;
    readonly longitude?: number | null;
    readonly sourcePropertyId?: string | null;
    readonly depositAmount?: number | null;
    readonly monthlyRent?: number | null;
    readonly salePrice?: number | null;
    readonly maintenanceFee?: number | null;
    readonly areaPyeong?: string | null;
    readonly floorInfo?: string | null;
    readonly memo?: string | null;
};

export type ContractStoreDraftInput = {
    readonly name?: string;
    readonly brand?: string;
    readonly region?: string;
    readonly address?: string;
    readonly latitude?: number | null;
    readonly longitude?: number | null;
    readonly openedAt?: string;
    readonly memo?: string;
};

export type ContractStoreLocationDraft = {
    readonly contractLeadId: string;
    readonly sourceLocationId: string;
    readonly sourceExternalListingId: string;
    readonly contractedAt: string;
    readonly name: string;
    readonly locationType: '가맹점';
    readonly status: '오픈준비';
    readonly brand: string;
    readonly region: string;
    readonly address: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly openedAt: string;
    readonly sourcePropertyId: string;
    readonly memo: string;
    readonly contractOwnerSnapshot: ContractStoreLeadInput;
    readonly sourceCandidateSnapshot: Record<string, unknown>;
    readonly openingHandoff: {
        readonly firstInspectionDueAt: string;
        readonly svMemo: string;
        readonly supportMemo: string;
    };
};

function cleanString(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function readNullableNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getSourceTitle(source: ContractStoreSourceInput | null): string {
    if (!source) return '';
    return cleanString(source.title) || cleanString(source.name);
}

export function readContractStoreSourceType(value: unknown): ContractStoreSourceType {
    const raw = cleanString(value);
    switch (raw) {
        case 'franchise_location':
        case 'external_property_listing':
        case 'direct':
            return raw;
        default:
            return 'direct';
    }
}

export function buildContractStoreLocationDraft(input: {
    readonly lead: ContractStoreLeadInput;
    readonly source: ContractStoreSourceInput | null;
    readonly draft: ContractStoreDraftInput;
    readonly nowIso: string;
}): ContractStoreLocationDraft {
    const sourceTitle = getSourceTitle(input.source);
    const draftName = cleanString(input.draft.name);
    const sourceRegion = cleanString(input.source?.region);
    const sourceAddress = cleanString(input.source?.address);
    const region = cleanString(input.draft.region) || sourceRegion || normalizeRegion(sourceAddress) || input.lead.desiredRegion;
    const address = cleanString(input.draft.address) || sourceAddress;
    const brand = cleanString(input.draft.brand) || cleanString(input.source?.brand) || input.lead.interestedBrand;
    const sourcePropertyId = input.source?.sourceType === 'franchise_location'
        ? cleanString(input.source.sourcePropertyId)
        : '';

    return {
        contractLeadId: input.lead.id,
        sourceLocationId: input.source?.sourceType === 'franchise_location' ? input.source.id : '',
        sourceExternalListingId: input.source?.sourceType === 'external_property_listing' ? input.source.id : '',
        contractedAt: input.nowIso,
        name: draftName || sourceTitle || `${input.lead.name} 가맹점`,
        locationType: '가맹점',
        status: '오픈준비',
        brand,
        region,
        address,
        latitude: readNullableNumber(input.draft.latitude) ?? readNullableNumber(input.source?.latitude),
        longitude: readNullableNumber(input.draft.longitude) ?? readNullableNumber(input.source?.longitude),
        openedAt: cleanString(input.draft.openedAt),
        sourcePropertyId,
        memo: cleanString(input.draft.memo) || `${input.lead.name} 계약 완료 후 오픈준비 전환`,
        contractOwnerSnapshot: input.lead,
        sourceCandidateSnapshot: input.source
            ? {
                id: input.source.id,
                sourceType: input.source.sourceType,
                name: input.source.name,
                title: input.source.title || '',
                locationType: input.source.locationType || '',
                brand: input.source.brand || '',
                status: input.source.status || '',
                region: input.source.region || '',
                address: input.source.address || '',
                depositAmount: input.source.depositAmount ?? null,
                monthlyRent: input.source.monthlyRent ?? null,
                salePrice: input.source.salePrice ?? null,
                maintenanceFee: input.source.maintenanceFee ?? null,
                areaPyeong: input.source.areaPyeong || '',
                floorInfo: input.source.floorInfo || '',
                memo: input.source.memo || ''
            }
            : {},
        openingHandoff: {
            firstInspectionDueAt: '',
            svMemo: '',
            supportMemo: ''
        }
    };
}
