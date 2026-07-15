import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequesterProfile } from '@/lib/api-auth';
import {
    toVendorContractView,
    type VendorContractRow
} from '@/lib/franchise-vendor-contracts';
import { buildVendorContractRenewalSchedule } from '@/lib/franchise-source-schedules';
import { upsertFranchiseSourceSchedule } from '@/lib/franchise-source-schedule-store';

export async function syncVendorContractScheduleSafely(input: {
    readonly requester: RequesterProfile;
    readonly row: VendorContractRow;
    readonly supabaseAdmin: SupabaseClient;
}): Promise<void> {
    try {
        const contract = toVendorContractView(input.row);
        const schedule = buildVendorContractRenewalSchedule(contract, {
            fallbackAssigneeProfileId: input.requester.id,
            managerProfileId: ['admin', 'manager'].includes(input.requester.role || '')
                ? input.requester.id
                : null
        });
        if (schedule) await upsertFranchiseSourceSchedule(input.supabaseAdmin, schedule);
    } catch (error) {
        console.warn('Optional vendor contract schedule sync skipped:', error);
    }
}
