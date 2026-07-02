import {
    canRenewVendorContractStatus,
    canTerminateVendorContractStatus
} from '@/lib/franchise-vendor-contracts';
import type { VendorContractEventView } from '@/lib/franchise-vendor-contract-events';
import type {
    VendorContractCategory,
    VendorContractDocumentSource,
    VendorContractStatus,
    VendorContractView
} from '@/lib/franchise-vendor-contracts';

export type VendorContract = VendorContractView;
export type VendorContractEvent = VendorContractEventView;

export type VendorContractsResponse = {
    readonly contracts?: readonly VendorContract[];
    readonly schemaReady?: boolean;
};

export type VendorContractEventsResponse = {
    readonly events?: readonly VendorContractEvent[];
    readonly schemaReady?: boolean;
};

export type VendorContractActionResponse = {
    readonly contract?: VendorContract;
    readonly nextContract?: VendorContract;
};

export type VendorContractForm = {
    readonly id: string;
    readonly vendorId: string;
    readonly category: VendorContractCategory;
    readonly vendorName: string;
    readonly contractTitle: string;
    readonly contractStartDate: string;
    readonly contractEndDate: string;
    readonly status: VendorContractStatus;
    readonly ownerProfileId: string;
    readonly documentSource: VendorContractDocumentSource;
    readonly electronicContractId: string;
    readonly storageBucket: string;
    readonly storagePath: string;
    readonly fileName: string;
    readonly memo: string;
};

export type UserOption = {
    readonly uuid: string;
    readonly name: string;
    readonly role: string;
};

export type ElectronicContractOption = {
    readonly id: string;
    readonly name: string;
    readonly status: string;
};

export type ElectronicContractsResponse = {
    readonly contracts?: readonly ElectronicContractOption[];
};

export type VendorContractQueueKey = 'all' | 'renewal' | 'expired' | 'ownerless' | 'terminal';

export type VendorContractQueueItem = {
    readonly key: VendorContractQueueKey;
    readonly label: string;
    readonly count: number;
};

export const CATEGORY_OPTIONS = [
    { value: 'logistics', label: '물류' },
    { value: 'food_material', label: '식자재' },
    { value: 'interior', label: '인테리어/시공' },
    { value: 'marketing', label: '마케팅' },
    { value: 'lease', label: '임대차' },
    { value: 'other', label: '기타' }
] as const;

export const STATUS_OPTIONS = [
    { value: 'active', label: '진행중' },
    { value: 'renewal_due', label: '만료예정' },
    { value: 'expired', label: '만료' },
    { value: 'terminated', label: '해지' },
    { value: 'renewed', label: '갱신완료' }
] as const;

export const EMPTY_FORM: VendorContractForm = {
    category: 'food_material',
    contractEndDate: '',
    contractStartDate: '',
    contractTitle: '',
    documentSource: 'manual',
    electronicContractId: '',
    fileName: '',
    id: '',
    memo: '',
    ownerProfileId: '',
    status: 'active',
    storageBucket: '',
    storagePath: '',
    vendorId: '',
    vendorName: ''
};

export function formFromContract(contract: VendorContract): VendorContractForm {
    return {
        category: contract.category,
        contractEndDate: contract.contractEndDate,
        contractStartDate: contract.contractStartDate,
        contractTitle: contract.contractTitle,
        documentSource: contract.documentSource,
        electronicContractId: contract.electronicContractId,
        fileName: contract.fileName,
        id: contract.id,
        memo: contract.memo,
        ownerProfileId: contract.ownerProfileId,
        status: contract.status,
        storageBucket: contract.storageBucket,
        storagePath: contract.storagePath,
        vendorId: contract.vendorId,
        vendorName: contract.vendorName
    };
}

export function contractStatusTone(contract: VendorContract): 'toneDanger' | 'toneWarning' | 'toneSuccess' | 'neutral' {
    if (contract.status === 'expired' || contract.status === 'terminated') return 'toneDanger';
    if (contract.status === 'renewal_due') return contract.remainingDays !== null && contract.remainingDays <= 7 ? 'toneDanger' : 'toneWarning';
    if (contract.status === 'renewed') return 'toneSuccess';
    return 'neutral';
}

export function canRenewContract(contract: VendorContract): boolean {
    return canRenewVendorContractStatus(contract.status);
}

export function canTerminateContract(contract: VendorContract): boolean {
    return canTerminateVendorContractStatus(contract.status);
}

export function isContractInQueue(contract: VendorContract, queue: VendorContractQueueKey): boolean {
    if (queue === 'all') return true;
    if (queue === 'renewal') return contract.status === 'renewal_due';
    if (queue === 'expired') return contract.status === 'expired';
    if (queue === 'ownerless') return !contract.ownerProfileId;
    return contract.status === 'terminated' || contract.status === 'renewed' || contract.status === 'archived';
}

export function buildVendorContractQueue(contracts: readonly VendorContract[]): readonly VendorContractQueueItem[] {
    return [
        { count: contracts.length, key: 'all', label: '전체' },
        { count: contracts.filter(contract => contract.status === 'renewal_due').length, key: 'renewal', label: '갱신 필요' },
        { count: contracts.filter(contract => contract.status === 'expired').length, key: 'expired', label: '만료' },
        { count: contracts.filter(contract => !contract.ownerProfileId).length, key: 'ownerless', label: '담당자 미지정' },
        {
            count: contracts.filter(contract => contract.status === 'terminated' || contract.status === 'renewed' || contract.status === 'archived').length,
            key: 'terminal',
            label: '종료/보관'
        }
    ];
}

export function electronicContractLabel(contract: ElectronicContractOption): string {
    const status = contract.status === 'completed'
        ? '서명 완료'
        : contract.status === 'sent'
            ? '서명 대기'
            : contract.status || '상태 없음';
    return `${contract.name || '전자계약'} · ${status}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseUserOptions(value: unknown): readonly UserOption[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap(item => {
        if (!isRecord(item)) return [];
        const uuid = typeof item.uuid === 'string' ? item.uuid.trim() : '';
        if (!uuid) return [];
        return [{
            name: typeof item.name === 'string' ? item.name : '',
            role: typeof item.role === 'string' ? item.role : '',
            uuid
        }];
    });
}
