import type { SupabaseClient } from '@supabase/supabase-js';
import {
    FRANCHISE_OPERATIONAL_SCHEDULE_SYNC_RPC,
    FRANCHISE_SCHEDULE_SYNC_JOB_TABLE,
    prepareFranchiseSourceSchedulePayload
} from './franchise-source-schedule-store';
import type { FranchiseSourceSchedulePayload } from './franchise-source-schedule-store';

type FranchiseScheduleSyncJob = {
    readonly id: string;
    readonly attempt_count: number;
    readonly lease_token: string;
    readonly schedule_payload: FranchiseSourceSchedulePayload;
    readonly updated_at: string;
};

export type FranchiseScheduleMaintenanceResult = {
    readonly delayedCount: number;
    readonly failedCount: number;
    readonly processedCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSchedulePayload(value: unknown): value is FranchiseSourceSchedulePayload {
    if (!isRecord(value)) return false;
    return typeof value.company_id === 'string'
        && typeof value.source_type === 'string'
        && typeof value.source_id === 'string'
        && typeof value.title === 'string'
        && typeof value.status === 'string';
}

function isSyncJob(value: unknown): value is FranchiseScheduleSyncJob {
    if (!isRecord(value)) return false;
    return typeof value.id === 'string'
        && typeof value.attempt_count === 'number'
        && typeof value.lease_token === 'string'
        && typeof value.updated_at === 'string'
        && isSchedulePayload(value.schedule_payload);
}

function retryAvailableAt(attemptCount: number, now: Date): string {
    const delayMinutes = Math.min(60, 2 ** Math.min(attemptCount, 5));
    return new Date(now.getTime() + delayMinutes * 60_000).toISOString();
}

async function claimSyncJobs(supabaseAdmin: SupabaseClient): Promise<readonly FranchiseScheduleSyncJob[]> {
    const { data, error } = await supabaseAdmin.rpc('claim_franchise_schedule_sync_jobs', { job_limit: 50 });
    if (error) throw error;
    return Array.isArray(data) ? data.filter(isSyncJob) : [];
}

async function failSyncJob(
    supabaseAdmin: SupabaseClient,
    job: FranchiseScheduleSyncJob,
    error: unknown,
    now: Date
): Promise<void> {
    const nextAttemptCount = job.attempt_count + 1;
    const message = error instanceof Error ? error.message : String(error);
    const { error: updateError } = await supabaseAdmin
        .from(FRANCHISE_SCHEDULE_SYNC_JOB_TABLE)
        .update({
            status: 'failed',
            attempt_count: nextAttemptCount,
            available_at: retryAvailableAt(nextAttemptCount, now),
            last_error: message.slice(0, 1000),
            updated_at: now.toISOString()
        })
        .match({ id: job.id, status: 'processing', updated_at: job.updated_at });
    if (updateError) throw updateError;
}

export async function runFranchiseScheduleMaintenance(
    supabaseAdmin: SupabaseClient,
    now: Date = new Date()
): Promise<FranchiseScheduleMaintenanceResult> {
    const { data: delayedData, error: delayedError } = await supabaseAdmin.rpc('reconcile_franchise_schedule_lateness');
    if (delayedError) throw delayedError;
    const delayedCount = typeof delayedData === 'number' ? delayedData : 0;
    const jobs = await claimSyncJobs(supabaseAdmin);
    let failedCount = 0;

    for (const job of jobs) {
        const schedulePayload = await prepareFranchiseSourceSchedulePayload(
            supabaseAdmin,
            job.schedule_payload
        );
        const { error } = await supabaseAdmin.rpc(FRANCHISE_OPERATIONAL_SCHEDULE_SYNC_RPC, {
            schedule_payload: {
                ...schedulePayload,
                _sync_job_id: job.id,
                _sync_job_token: job.lease_token,
                _sync_job_updated_at: job.updated_at
            }
        });
        if (error) {
            failedCount += 1;
            await failSyncJob(supabaseAdmin, job, error, now);
            continue;
        }
    }

    return {
        delayedCount,
        failedCount,
        processedCount: jobs.length
    };
}
