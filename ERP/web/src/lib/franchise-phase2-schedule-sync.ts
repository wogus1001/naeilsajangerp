import type { SupabaseClient } from '@supabase/supabase-js';
import { buildOwnerSubmissionSourceSchedule } from './franchise-phase2-source-schedules';
import {
    buildFranchiseSourceSchedulePayload,
    enqueueFranchiseScheduleSync,
    executeFranchiseOperationalScheduleSync,
    prepareFranchiseSourceSchedule
} from './franchise-source-schedule-store';
import type { FranchiseSourceScheduleInput } from './franchise-source-schedules';
import { fetchWorkflowManagerProfileIds } from './franchise-workflow-store';

type OwnerSubmissionScheduleSyncInput = {
    readonly companyId: string;
    readonly locationName: string;
    readonly managerProfileId?: string | null;
    readonly status: string;
    readonly submissionId: string;
    readonly submissionType: string;
    readonly submittedAt: string | Date;
    readonly supabaseAdmin: SupabaseClient;
    readonly title: string;
};

async function fetchActiveCompanyManagerProfileIds(
    supabaseAdmin: SupabaseClient,
    companyId: string,
    profileIds: readonly string[]
): Promise<ReadonlySet<string>> {
    const candidates = [...new Set(profileIds.filter(Boolean))];
    if (candidates.length === 0) return new Set();
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .in('id', candidates)
        .returns<Array<{ readonly id: string; readonly role: string | null }>>();
    if (error) throw error;
    return new Set((data || [])
        .filter(profile => profile.role === 'admin' || profile.role === 'manager')
        .map(profile => profile.id));
}

export async function syncFranchiseOperationalSchedule(
    supabaseAdmin: SupabaseClient,
    schedule: FranchiseSourceScheduleInput
): Promise<void> {
    let preparedSchedule = schedule;
    try {
        preparedSchedule = await prepareFranchiseSourceSchedule(supabaseAdmin, schedule);
        await executeFranchiseOperationalScheduleSync(preparedSchedule, async (name, args) => {
            const { error } = await supabaseAdmin.rpc(name, args);
            return { error };
        });
    } catch (error) {
        const schedulePayload = buildFranchiseSourceSchedulePayload(preparedSchedule);
        if (!schedulePayload) throw error;
        await enqueueFranchiseScheduleSync(supabaseAdmin, schedulePayload, error);
    }
}

export async function safelySyncOwnerSubmissionSchedule(
    input: OwnerSubmissionScheduleSyncInput
): Promise<void> {
    let managerProfileId = input.managerProfileId || null;
    try {
        const fallbackManagerIds = await fetchWorkflowManagerProfileIds(input.supabaseAdmin, input.companyId);
        const managerCandidates = [...new Set([
            input.managerProfileId || '',
            ...fallbackManagerIds
        ].filter(Boolean))];
        const activeManagerIds = await fetchActiveCompanyManagerProfileIds(
            input.supabaseAdmin,
            input.companyId,
            managerCandidates
        );
        managerProfileId = managerCandidates.find(profileId => activeManagerIds.has(profileId)) || null;
    } catch (error) {
        console.warn('Owner submission manager fallback lookup failed:', error);
    }
    const schedule = buildOwnerSubmissionSourceSchedule({
        companyId: input.companyId,
        locationName: input.locationName,
        managerProfileId,
        status: input.status,
        submissionId: input.submissionId,
        submissionType: input.submissionType,
        submittedAt: input.submittedAt,
        title: input.title
    });
    if (schedule) await syncFranchiseOperationalSchedule(input.supabaseAdmin, schedule);
}
