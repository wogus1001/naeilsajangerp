import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    VendorContractNotificationContract,
    VendorContractNotificationRecipient
} from './franchise-vendor-contract-notifications';
import type { NotificationLead } from './franchise-notifications';
import { syncFranchiseOperationalSchedule } from './franchise-phase2-schedule-sync';
import {
    buildDisclosureEligibilitySchedule,
    buildVendorContractRenewalSchedule
} from './franchise-source-schedules';

type NotificationScheduleSyncInput = {
    readonly leads: readonly NotificationLead[];
    readonly now?: Date;
    readonly vendorContracts: readonly VendorContractNotificationContract[];
    readonly vendorRecipients: readonly VendorContractNotificationRecipient[];
};

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function mapManagerByCompany(
    recipients: readonly VendorContractNotificationRecipient[]
): ReadonlyMap<string, string> {
    const managers = new Map<string, string>();
    for (const recipient of recipients) {
        const companyId = cleanText(recipient.companyId);
        const profileId = cleanText(recipient.profileId);
        if (companyId && profileId && !cleanText(recipient.contractId) && !managers.has(companyId)) {
            managers.set(companyId, profileId);
        }
    }
    return managers;
}

export async function syncNotificationSourceSchedules(
    supabaseAdmin: SupabaseClient,
    input: NotificationScheduleSyncInput
): Promise<void> {
    const now = input.now || new Date();
    const managerByCompany = mapManagerByCompany(input.vendorRecipients);
    const disclosureSchedules = input.leads
        .map(lead => buildDisclosureEligibilitySchedule(lead, now))
        .filter(schedule => schedule !== null);
    const vendorSchedules = input.vendorContracts
        .map(contract => {
            const companyId = cleanText(contract.companyId);
            const managerProfileId = managerByCompany.get(companyId) || null;
            return buildVendorContractRenewalSchedule(contract, {
                fallbackAssigneeProfileId: managerProfileId || '',
                managerProfileId,
                now
            });
        })
        .filter(schedule => schedule !== null);

    await Promise.all(
        [...disclosureSchedules, ...vendorSchedules]
            .map(schedule => syncFranchiseOperationalSchedule(supabaseAdmin, schedule))
    );
}
