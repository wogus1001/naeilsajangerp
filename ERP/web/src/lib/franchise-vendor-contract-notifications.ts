import { daysUntilDate } from './franchise-vendor-contracts';
import type { FranchiseNotificationCandidate } from './franchise-notifications';

export type VendorContractNotificationContract = {
    readonly id: string;
    readonly companyId?: string | null;
    readonly ownerProfileId?: string | null;
    readonly vendorName: string;
    readonly contractTitle: string;
    readonly contractEndDate?: string | null;
    readonly status: string;
};

export type VendorContractNotificationRecipient = {
    readonly companyId: string;
    readonly contractId?: string | null;
    readonly profileId: string;
};

function cleanString(value: unknown): string {
    return String(value || '').trim();
}

function toIsoOrNull(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildVendorContractActionUrl(contractId: string): string {
    return `/contracts/vendor?contractId=${encodeURIComponent(contractId)}`;
}

function createVendorContractCandidate(
    contract: VendorContractNotificationContract,
    recipientProfileId: string,
    remainingDays: number
): FranchiseNotificationCandidate | null {
    const companyId = cleanString(contract.companyId);
    const cleanRecipientProfileId = cleanString(recipientProfileId);
    if (!companyId || !cleanRecipientProfileId) return null;

    const vendorName = cleanString(contract.vendorName) || '업체';
    const contractTitle = cleanString(contract.contractTitle) || '업체 계약';
    return {
        actionUrl: buildVendorContractActionUrl(contract.id),
        body: `${vendorName} ${contractTitle} 만료까지 ${remainingDays}일 남았습니다.`,
        companyId,
        data: {
            contractTitle,
            remainingDays,
            vendorName
        },
        dueAt: toIsoOrNull(contract.contractEndDate),
        leadId: null,
        recipientProfileId: cleanRecipientProfileId,
        severity: remainingDays <= 7 ? 'danger' : 'warning',
        sourceId: `${contract.id}:vendor-contract-due`,
        sourceType: 'vendor-contract-due',
        title: `업체 계약 D-${remainingDays}`
    };
}

export function buildVendorContractNotifications(
    contracts: readonly VendorContractNotificationContract[],
    recipients: readonly VendorContractNotificationRecipient[],
    now: Date = new Date()
): readonly FranchiseNotificationCandidate[] {
    const recipientsByCompany = new Map<string, Set<string>>();
    for (const recipient of recipients) {
        const companyId = cleanString(recipient.companyId);
        const profileId = cleanString(recipient.profileId);
        if (!companyId || !profileId || cleanString(recipient.contractId)) continue;
        const companyRecipients = recipientsByCompany.get(companyId) || new Set<string>();
        companyRecipients.add(profileId);
        recipientsByCompany.set(companyId, companyRecipients);
    }

    return contracts.flatMap(contract => {
        if (contract.status === 'terminated' || contract.status === 'renewed' || contract.status === 'archived') {
            return [];
        }

        const remainingDays = daysUntilDate(contract.contractEndDate, now);
        if (remainingDays === null || remainingDays < 0 || remainingDays > 30) return [];

        const companyId = cleanString(contract.companyId);
        const managerRecipients = recipientsByCompany.get(companyId) || new Set<string>();
        const recipientsForContract = new Set(managerRecipients);
        const ownerProfileId = cleanString(contract.ownerProfileId);
        const ownerIsScopedToContract = recipients.some(recipient =>
            cleanString(recipient.companyId) === companyId
            && cleanString(recipient.profileId) === ownerProfileId
            && cleanString(recipient.contractId) === contract.id
        );
        if (ownerProfileId && ownerIsScopedToContract) {
            recipientsForContract.add(ownerProfileId);
        }

        return [...recipientsForContract]
            .map(profileId => createVendorContractCandidate(contract, profileId, remainingDays))
            .filter((candidate): candidate is FranchiseNotificationCandidate => Boolean(candidate));
    });
}
