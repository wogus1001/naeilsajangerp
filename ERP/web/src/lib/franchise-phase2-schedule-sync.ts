import type { SupabaseClient } from '@supabase/supabase-js';
import { buildOwnerSettlementSourceSchedule, buildOwnerSubmissionSourceSchedule } from './franchise-phase2-source-schedules';
import {
    buildFranchiseSourceSchedulePayload,
    enqueueFranchiseScheduleSync,
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

type OwnerSettlementScheduleSyncInput = {
    readonly companyId: string;
    readonly dueAt: string;
    readonly locationName: string;
    readonly managerProfileId?: string | null;
    readonly requestTitle: string;
    readonly status: string;
    readonly submissionId: string;
    readonly supabaseAdmin: SupabaseClient;
};

export type FranchiseOperationalSchedulePersistedResult =
    | { readonly status: 'synced' }
    | { readonly status: 'queued' };

export type FranchiseOperationalScheduleSyncResult =
    | FranchiseOperationalSchedulePersistedResult
    | { readonly status: 'failed'; readonly message: string };

function readScheduleSyncErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }
    return String(error);
}

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
): Promise<FranchiseOperationalSchedulePersistedResult> {
    const preparedSchedule = await prepareFranchiseSourceSchedule(supabaseAdmin, schedule);
    const schedulePayload = buildFranchiseSourceSchedulePayload(preparedSchedule);
    if (!schedulePayload) return { status: 'synced' };
    const lease = await enqueueFranchiseScheduleSync(supabaseAdmin, schedulePayload, null);
    const { error } = await supabaseAdmin.rpc('sync_franchise_operational_schedule_from_payload', {
        schedule_payload: {
            ...schedulePayload,
            _sync_job_token: lease.token,
            _sync_job_updated_at: lease.updatedAt
        }
    });
    if (error) {
        console.warn('Franchise operational schedule queued for retry:', error);
        return { status: 'queued' };
    }
    return { status: 'synced' };
}

export async function trySyncFranchiseOperationalSchedule(
    supabaseAdmin: SupabaseClient,
    schedule: FranchiseSourceScheduleInput
): Promise<FranchiseOperationalScheduleSyncResult> {
    try {
        return await syncFranchiseOperationalSchedule(supabaseAdmin, schedule);
    } catch (error) {
        const message = readScheduleSyncErrorMessage(error);
        console.error('Franchise operational schedule could not be queued:', message);
        return { status: 'failed', message };
    }
}

export async function safelySyncOwnerSubmissionSchedule(
    input: OwnerSubmissionScheduleSyncInput
): Promise<FranchiseOperationalScheduleSyncResult> {
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
    if (!schedule) return { status: 'synced' };
    return trySyncFranchiseOperationalSchedule(input.supabaseAdmin, schedule);
}

export async function safelySyncOwnerSettlementSchedule(
    input: OwnerSettlementScheduleSyncInput
): Promise<FranchiseOperationalScheduleSyncResult> {
    let managerProfileId = input.managerProfileId || null;
    try {
        const fallbackManagerIds = await fetchWorkflowManagerProfileIds(input.supabaseAdmin, input.companyId);
        const candidates = [...new Set([managerProfileId || '', ...fallbackManagerIds].filter(Boolean))];
        const activeManagerIds = await fetchActiveCompanyManagerProfileIds(input.supabaseAdmin, input.companyId, candidates);
        managerProfileId = candidates.find(profileId => activeManagerIds.has(profileId)) || null;
    } catch (error) {
        console.warn('Owner settlement manager fallback lookup failed:', error);
    }
    const schedule = buildOwnerSettlementSourceSchedule({ ...input, managerProfileId });
    if (!schedule) return { status: 'synced' };
    return trySyncFranchiseOperationalSchedule(input.supabaseAdmin, schedule);
}
