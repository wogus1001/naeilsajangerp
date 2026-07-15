import type { VendorContractNotificationContract } from './franchise-vendor-contract-notifications';
import type { NotificationLead } from './franchise-notifications';
import {
    dateKeyFromScheduleValue,
    kstDateKey,
    type WorkflowScheduleStatus
} from './franchise-workflow';

export const VENDOR_CONTRACT_RENEWAL_SOURCE_TYPE = 'vendor-contract-renewal';
export const DISCLOSURE_ELIGIBILITY_SOURCE_TYPE = 'disclosure-contract-eligible';

export type FranchiseSourceScheduleInput = {
    readonly assigneeProfileId?: string | null;
    readonly color?: string | null;
    readonly companyId: string;
    readonly completedAt?: string | null;
    readonly date?: string | null;
    readonly details?: string | null;
    readonly dueAt?: string | null;
    readonly managerProfileId?: string | null;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly remindAt?: string | null;
    readonly sourceId: string;
    readonly sourceType: string;
    readonly status?: WorkflowScheduleStatus | string | null;
    readonly title: string;
    readonly type?: string | null;
    readonly userId?: string | null;
};

type VendorContractScheduleContext = {
    readonly fallbackAssigneeProfileId: string;
    readonly managerProfileId: string | null;
    readonly now?: Date;
};

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function vendorContractScheduleStatus(
    status: string,
    endDate: string,
    now: Date
): WorkflowScheduleStatus {
    if (status === 'renewed') return '완료';
    if (status === 'terminated' || status === 'archived') return '취소';
    if (status === 'expired' || endDate < kstDateKey(now)) return '지연';
    return '예정';
}

export function buildVendorContractRenewalSchedule(
    contract: VendorContractNotificationContract,
    context: VendorContractScheduleContext
): FranchiseSourceScheduleInput | null {
    const companyId = cleanText(contract.companyId);
    const contractId = cleanText(contract.id);
    const contractEndDate = dateKeyFromScheduleValue(contract.contractEndDate);
    if (!companyId || !contractId || !contractEndDate) return null;

    const now = context.now || new Date();
    const vendorName = cleanText(contract.vendorName) || '업체';
    const contractTitle = cleanText(contract.contractTitle) || '계약';
    const ownerProfileId = cleanText(contract.ownerProfileId);
    const assigneeProfileId = ownerProfileId || cleanText(context.fallbackAssigneeProfileId) || null;
    const status = vendorContractScheduleStatus(cleanText(contract.status), contractEndDate, now);

    return {
        assigneeProfileId,
        color: '#f59e0b',
        companyId,
        date: contractEndDate,
        details: `${vendorName} ${contractTitle} 계약의 갱신 여부를 확인합니다.`,
        dueAt: `${contractEndDate}T23:59:59+09:00`,
        managerProfileId: cleanText(context.managerProfileId) || null,
        metadata: {
            actionUrl: '/dashboard/franchise-vendors',
            contractId,
            contractTitle,
            vendorName
        },
        sourceId: contractId,
        sourceType: VENDOR_CONTRACT_RENEWAL_SOURCE_TYPE,
        status,
        title: `업체 계약 갱신 확인: ${vendorName} ${contractTitle}`,
        type: '업체 계약',
        userId: assigneeProfileId
    };
}

export function buildDisclosureEligibilitySchedule(
    lead: NotificationLead,
    now: Date = new Date()
): FranchiseSourceScheduleInput | null {
    const companyId = cleanText(lead.companyId);
    const managerProfileId = cleanText(lead.managerId);
    const eligibility = lead.disclosureSummary;
    if (!eligibility) return null;
    const eligibleAt = eligibility.contractEligibleAt;
    const eligibleDate = dateKeyFromScheduleValue(eligibleAt);
    if (!companyId || !managerProfileId || !eligibleAt || !eligibleDate) return null;

    const leadId = cleanText(lead.id);
    if (!leadId) return null;
    const isEligible = eligibility.state === 'eligible' || eligibleDate <= kstDateKey(now);
    const status: WorkflowScheduleStatus = isEligible ? '완료' : '예정';
    const leadName = cleanText(lead.name) || '가맹 희망자';

    return {
        assigneeProfileId: managerProfileId,
        color: '#0ea5e9',
        companyId,
        date: eligibleDate,
        details: `${leadName}님의 정보공개서 대기 기간 종료일입니다.`,
        dueAt: eligibleAt,
        managerProfileId,
        metadata: {
            actionUrl: `/dashboard/franchise-leads?leadId=${encodeURIComponent(leadId)}`,
            deliveryId: eligibility.latestDeliveryId,
            leadId,
            leadName
        },
        sourceId: leadId,
        sourceType: DISCLOSURE_ELIGIBILITY_SOURCE_TYPE,
        status,
        title: `정보공개서 계약 가능일: ${leadName}`,
        type: '정보공개서',
        userId: managerProfileId
    };
}
