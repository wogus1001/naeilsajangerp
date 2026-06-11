import type { FranchiseLeadStatus } from '@/lib/franchise-leads';

export const DISCLOSURE_CONTRACT_WAIT_DAYS = 14;
export const DISCLOSURE_CHANNELS = ['manual', 'email', 'sms', 'kakao', 'postal', 'in_person'] as const;
export const CONTRACT_LOCKED_LEAD_STATUSES = ['계약예정', '계약완료'] as const satisfies readonly FranchiseLeadStatus[];

export type DisclosureChannel = typeof DISCLOSURE_CHANNELS[number];

export type DisclosureDocumentStatus = 'active' | 'archived';

export type FranchiseDisclosureDocument = {
    readonly id: string;
    readonly companyId: string;
    readonly createdBy: string | null;
    readonly title: string;
    readonly brandName: string;
    readonly franchisorName: string;
    readonly version: string;
    readonly fileUrl: string;
    readonly fileName: string;
    readonly issuedAt: string | null;
    readonly memo: string;
    readonly status: DisclosureDocumentStatus;
    readonly createdAt: string;
    readonly updatedAt: string;
};

export type FranchiseLeadDisclosureDelivery = {
    readonly id: string;
    readonly companyId: string;
    readonly leadId: string;
    readonly documentId: string | null;
    readonly sentBy: string | null;
    readonly sentAt: string;
    readonly channel: DisclosureChannel;
    readonly recipientName: string;
    readonly recipientContact: string;
    readonly documentTitle: string;
    readonly documentVersion: string;
    readonly evidenceUrl: string;
    readonly memo: string;
    readonly createdAt: string;
    readonly updatedAt: string;
};

export type DisclosureDeliveryForEligibility = {
    readonly id?: string | null;
    readonly sentAt?: string | null;
    readonly sent_at?: string | null;
    readonly documentTitle?: string | null;
    readonly document_title?: string | null;
    readonly documentVersion?: string | null;
    readonly document_version?: string | null;
};

export type DisclosureEligibility = {
    readonly waitDays: number;
    readonly hasDelivery: boolean;
    readonly isEligible: boolean;
    readonly latestDeliveryId: string | null;
    readonly latestSentAt: string | null;
    readonly latestDocumentTitle: string;
    readonly latestDocumentVersion: string;
    readonly contractEligibleAt: string | null;
    readonly remainingDays: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function cleanString(value: unknown): string {
    return String(value || '').trim();
}

function parseDate(value: unknown): Date | null {
    const raw = cleanString(value);
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function addDisclosureWaitDays(sentAt: string | Date, waitDays = DISCLOSURE_CONTRACT_WAIT_DAYS): Date {
    const baseDate = sentAt instanceof Date ? sentAt : new Date(sentAt);
    return new Date(baseDate.getTime() + waitDays * DAY_MS);
}

export function normalizeDisclosureChannel(value: unknown): DisclosureChannel {
    const raw = cleanString(value);
    return DISCLOSURE_CHANNELS.find(channel => channel === raw) || 'manual';
}

export function isContractLockedLeadStatus(status: unknown): status is typeof CONTRACT_LOCKED_LEAD_STATUSES[number] {
    return CONTRACT_LOCKED_LEAD_STATUSES.some(item => item === status);
}

export function getDisclosureEligibility(
    deliveries: readonly DisclosureDeliveryForEligibility[],
    now: Date = new Date()
): DisclosureEligibility {
    const latest = deliveries
        .map(delivery => {
            const sentAt = parseDate(delivery.sentAt ?? delivery.sent_at);
            if (!sentAt) return null;
            return { delivery, sentAt };
        })
        .filter((item): item is { readonly delivery: DisclosureDeliveryForEligibility; readonly sentAt: Date } => item !== null)
        .sort((left, right) => right.sentAt.getTime() - left.sentAt.getTime())[0];

    if (!latest) {
        return {
            waitDays: DISCLOSURE_CONTRACT_WAIT_DAYS,
            hasDelivery: false,
            isEligible: false,
            latestDeliveryId: null,
            latestSentAt: null,
            latestDocumentTitle: '',
            latestDocumentVersion: '',
            contractEligibleAt: null,
            remainingDays: null
        };
    }

    const contractEligibleAt = addDisclosureWaitDays(latest.sentAt);
    const remainingMs = contractEligibleAt.getTime() - now.getTime();

    return {
        waitDays: DISCLOSURE_CONTRACT_WAIT_DAYS,
        hasDelivery: true,
        isEligible: remainingMs <= 0,
        latestDeliveryId: cleanString(latest.delivery.id) || null,
        latestSentAt: latest.sentAt.toISOString(),
        latestDocumentTitle: cleanString(latest.delivery.documentTitle ?? latest.delivery.document_title),
        latestDocumentVersion: cleanString(latest.delivery.documentVersion ?? latest.delivery.document_version),
        contractEligibleAt: contractEligibleAt.toISOString(),
        remainingDays: remainingMs <= 0 ? 0 : Math.ceil(remainingMs / DAY_MS)
    };
}

export function canEnterContractStatus(nextStatus: FranchiseLeadStatus, eligibility: DisclosureEligibility): boolean {
    if (!isContractLockedLeadStatus(nextStatus)) return true;
    return eligibility.isEligible;
}

export function getContractLockMessage(eligibility: DisclosureEligibility): string {
    if (!eligibility.hasDelivery) {
        return '정보공개서 발송 이력이 있어야 계약 단계로 변경할 수 있습니다.';
    }
    if (eligibility.isEligible) {
        return '계약 단계로 변경할 수 있습니다.';
    }
    const eligibleDate = eligibility.contractEligibleAt
        ? new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(eligibility.contractEligibleAt))
        : '';
    return `정보공개서 발송 후 ${eligibility.waitDays}일이 지나야 계약 단계로 변경할 수 있습니다.${eligibleDate ? ` 계약 가능일: ${eligibleDate}` : ''}`;
}
