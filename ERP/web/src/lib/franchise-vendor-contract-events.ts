import {
    normalizeVendorContractStatus,
    statusLabel,
    type VendorContractStatus
} from './franchise-vendor-contracts';

export const VENDOR_CONTRACT_EVENT_TYPES = [
    'created',
    'updated',
    'renewed',
    'terminated',
    'archived'
] as const;

export type VendorContractEventType = typeof VENDOR_CONTRACT_EVENT_TYPES[number];

export type VendorContractEventRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly contract_id: string | null;
    readonly next_contract_id: string | null;
    readonly event_type: string | null;
    readonly reason: string | null;
    readonly previous_status: string | null;
    readonly next_status: string | null;
    readonly data: unknown;
    readonly created_by: string | null;
    readonly created_at: string | null;
};

export type VendorContractEventView = {
    readonly id: string;
    readonly companyId: string;
    readonly contractId: string;
    readonly nextContractId: string;
    readonly eventType: VendorContractEventType;
    readonly eventLabel: string;
    readonly reason: string;
    readonly previousStatus: VendorContractStatus | '';
    readonly previousStatusLabel: string;
    readonly nextStatus: VendorContractStatus | '';
    readonly nextStatusLabel: string;
    readonly createdBy: string;
    readonly createdAt: string;
};

const EVENT_LABELS: Readonly<Record<VendorContractEventType, string>> = {
    archived: '보관 처리',
    created: '계약 생성',
    renewed: '갱신 처리',
    terminated: '종료/해지',
    updated: '계약 수정'
};

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function isVendorContractEventType(value: string): value is VendorContractEventType {
    return VENDOR_CONTRACT_EVENT_TYPES.some(eventType => eventType === value);
}

function statusLabelOrBlank(value: string | null): string {
    if (!value) return '';
    return statusLabel(normalizeVendorContractStatus(value));
}

export function normalizeVendorContractEventType(value: unknown): VendorContractEventType {
    const normalized = cleanString(value);
    return isVendorContractEventType(normalized) ? normalized : 'updated';
}

export function eventTypeLabel(eventType: VendorContractEventType): string {
    return EVENT_LABELS[eventType];
}

export function toVendorContractEventView(row: VendorContractEventRow): VendorContractEventView {
    const eventType = normalizeVendorContractEventType(row.event_type);
    const previousStatus = row.previous_status ? normalizeVendorContractStatus(row.previous_status) : '';
    const nextStatus = row.next_status ? normalizeVendorContractStatus(row.next_status) : '';
    return {
        companyId: row.company_id || '',
        contractId: row.contract_id || '',
        createdAt: row.created_at || '',
        createdBy: row.created_by || '',
        eventLabel: eventTypeLabel(eventType),
        eventType,
        id: row.id,
        nextContractId: row.next_contract_id || '',
        nextStatus,
        nextStatusLabel: statusLabelOrBlank(row.next_status),
        previousStatus,
        previousStatusLabel: statusLabelOrBlank(row.previous_status),
        reason: row.reason || ''
    };
}
