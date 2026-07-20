import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequesterProfile } from '@/lib/api-auth';
import {
    toVendorContractView,
    type VendorContractRow
} from '@/lib/franchise-vendor-contracts';
import { trySyncFranchiseOperationalSchedule } from '@/lib/franchise-phase2-schedule-sync';
import type { FranchiseOperationalScheduleSyncResult } from '@/lib/franchise-phase2-schedule-sync';
import { buildVendorContractRenewalSchedule } from '@/lib/franchise-source-schedules';

type VendorContractScheduleSyncInput = {
    readonly previousContractEndDate?: string | null;
    readonly requester: RequesterProfile;
    readonly row: VendorContractRow;
};

export function buildVendorContractScheduleForSync(
    input: VendorContractScheduleSyncInput
) {
    const contract = toVendorContractView(input.row);
    const context = {
        fallbackAssigneeProfileId: input.requester.id,
        managerProfileId: ['admin', 'manager'].includes(input.requester.role || '')
            ? input.requester.id
            : null
    };
    const currentSchedule = buildVendorContractRenewalSchedule(contract, context);
    if (currentSchedule) return currentSchedule;

    const previousContractEndDate = String(input.previousContractEndDate || '').trim();
    if (!previousContractEndDate || input.row.contract_end_date) return null;

    return buildVendorContractRenewalSchedule({
        ...contract,
        contractEndDate: previousContractEndDate,
        status: 'archived'
    }, context);
}

export async function syncVendorContractSchedule(input: {
    readonly previousContractEndDate?: string | null;
    readonly requester: RequesterProfile;
    readonly row: VendorContractRow;
    readonly supabaseAdmin: SupabaseClient;
}): Promise<FranchiseOperationalScheduleSyncResult> {
    const schedule = buildVendorContractScheduleForSync(input);
    if (!schedule) return { status: 'synced' };
    return trySyncFranchiseOperationalSchedule(input.supabaseAdmin, schedule);
}
