import { POST as generateScheduledNotifications } from '../route';
import { isMissingOwnerContentSchemaError } from '@/lib/franchise-owner-content';
import { isMissingOwnerSettlementSchemaError } from '@/lib/franchise-owner-settlements';
import { safelySyncOwnerSettlementSchedule } from '@/lib/franchise-phase2-schedule-sync';
import {
    needsOwnerSettlementScheduleReconciliation,
    OWNER_SETTLEMENT_REVIEW_SOURCE_TYPE
} from '@/lib/franchise-phase2-source-schedules';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type PendingDeletion = {
    readonly id: string;
    readonly storage_bucket: string;
    readonly storage_path: string;
};

type SettlementScheduleSubmission = {
    readonly id: string;
    readonly company_id: string;
    readonly location_id: string;
    readonly request_id: string;
    readonly status: string;
};

type SettlementScheduleRequest = {
    readonly id: string;
    readonly company_id: string;
    readonly due_at: string;
    readonly title: string;
};

type SettlementScheduleLocation = {
    readonly id: string;
    readonly company_id: string;
    readonly manager_id: string | null;
    readonly name: string | null;
};

type SettlementScheduleRow = {
    readonly due_at: string | null;
    readonly metadata: Record<string, unknown> | null;
    readonly source_id: string;
    readonly status: string;
};

const SETTLEMENT_RECONCILIATION_BATCH_SIZE = 100;

async function reconcileOwnerSettlementSchedules() {
    const supabaseAdmin = getSupabaseAdmin();
    let synced = 0;
    let queued = 0;
    let failed = 0;
    let offset = 0;
    while (true) {
        const submissionResult = await supabaseAdmin
            .from('franchise_owner_settlement_submissions')
            .select('id, company_id, location_id, request_id, status')
            .in('status', ['submitted', 'rejected', 'confirmed'])
            .order('id', { ascending: true })
            .range(offset, offset + SETTLEMENT_RECONCILIATION_BATCH_SIZE - 1)
            .returns<SettlementScheduleSubmission[]>();
        if (submissionResult.error) {
            if (isMissingOwnerSettlementSchemaError(submissionResult.error)) {
                return { synced: 0, queued: 0, failed: 0, schemaReady: false };
            }
            throw submissionResult.error;
        }
        const submissions = submissionResult.data || [];
        if (submissions.length === 0) break;

        const requestIds = [...new Set(submissions.map(item => item.request_id))];
        const locationIds = [...new Set(submissions.map(item => item.location_id))];
        const submissionIds = submissions.map(item => item.id);
        const [requestResult, locationResult, scheduleResult] = await Promise.all([
            supabaseAdmin.from('franchise_owner_settlement_requests')
                .select('id, company_id, due_at, title').in('id', requestIds).returns<SettlementScheduleRequest[]>(),
            supabaseAdmin.from('franchise_locations')
                .select('id, company_id, manager_id, name').in('id', locationIds).returns<SettlementScheduleLocation[]>(),
            supabaseAdmin.from('franchise_schedules')
                .select('source_id, status, due_at, metadata')
                .eq('source_type', OWNER_SETTLEMENT_REVIEW_SOURCE_TYPE)
                .in('source_id', submissionIds)
                .returns<SettlementScheduleRow[]>()
        ]);
        if (requestResult.error) throw requestResult.error;
        if (locationResult.error) throw locationResult.error;
        if (scheduleResult.error) throw scheduleResult.error;
        const requests = new Map((requestResult.data || []).map(item => [item.id, item]));
        const locations = new Map((locationResult.data || []).map(item => [item.id, item]));
        const schedules = new Map((scheduleResult.data || []).map(item => [item.source_id, item]));

        for (const submission of submissions) {
            const settlementRequest = requests.get(submission.request_id);
            const location = locations.get(submission.location_id);
            if (!settlementRequest || !location
                || settlementRequest.company_id !== submission.company_id
                || location.company_id !== submission.company_id) {
                failed += 1;
                continue;
            }
            const syncInput = {
                companyId: submission.company_id,
                dueAt: settlementRequest.due_at,
                locationName: location.name || '운영점',
                managerProfileId: location.manager_id,
                requestTitle: settlementRequest.title,
                status: submission.status,
                submissionId: submission.id,
                supabaseAdmin
            };
            if (!needsOwnerSettlementScheduleReconciliation(syncInput, schedules.get(submission.id) || null)) continue;
            const result = await safelySyncOwnerSettlementSchedule(syncInput);
            if (result.status === 'synced') synced += 1;
            else if (result.status === 'queued') queued += 1;
            else failed += 1;
        }
        if (submissions.length < SETTLEMENT_RECONCILIATION_BATCH_SIZE) break;
        offset += SETTLEMENT_RECONCILIATION_BATCH_SIZE;
    }
    return { synced, queued, failed, schemaReady: true };
}

async function reconcileOwnerPortalFileDeletions() {
    const supabaseAdmin = getSupabaseAdmin();
    const cleanupResult = await supabaseAdmin.rpc('enqueue_franchise_owner_stale_file_cleanup');
    if (cleanupResult.error) {
        if (isMissingOwnerContentSchemaError(cleanupResult.error)) return { enqueued: 0, processed: 0, failed: 0, schemaReady: false };
        throw cleanupResult.error;
    }
    const enqueued = typeof cleanupResult.data === 'number' ? cleanupResult.data : 0;
    const pendingResult = await supabaseAdmin
        .from('franchise_owner_file_deletion_outbox')
        .select('id, storage_bucket, storage_path')
        .eq('state', 'pending')
        .order('requested_at', { ascending: true })
        .limit(50)
        .returns<PendingDeletion[]>();
    if (pendingResult.error) {
        if (isMissingOwnerContentSchemaError(pendingResult.error)) return { enqueued, processed: 0, failed: 0, schemaReady: false };
        throw pendingResult.error;
    }

    let processed = 0;
    let failed = 0;
    for (const job of pendingResult.data || []) {
        const storageResult = await supabaseAdmin.storage.from(job.storage_bucket).remove([job.storage_path]);
        if (storageResult.error) {
            failed += 1;
            await supabaseAdmin.rpc('record_franchise_owner_file_deletion_failure', {
                p_error: storageResult.error.message,
                p_outbox_id: job.id
            });
            continue;
        }
        const completionResult = await supabaseAdmin.rpc('complete_franchise_owner_file_deletion', {
            p_outbox_id: job.id
        });
        if (completionResult.error) {
            failed += 1;
            await supabaseAdmin.rpc('record_franchise_owner_file_deletion_failure', {
                p_error: completionResult.error.message,
                p_outbox_id: job.id
            });
            continue;
        }
        processed += 1;
    }
    return { enqueued, processed, failed, schemaReady: true };
}

export async function GET(request: Request) {
    const commandRequest = new Request(new URL('/api/franchise-notifications', request.url), {
        headers: {
            authorization: request.headers.get('authorization') || ''
        },
        method: 'POST'
    });
    const notificationResponse = await generateScheduledNotifications(commandRequest);
    if (!notificationResponse.ok) return notificationResponse;

    let phase3FileReconciliation = { enqueued: 0, processed: 0, failed: 0, schemaReady: true };
    let phase3SettlementScheduleReconciliation = { synced: 0, queued: 0, failed: 0, schemaReady: true };
    try {
        phase3FileReconciliation = await reconcileOwnerPortalFileDeletions();
    } catch (error) {
        phase3FileReconciliation = { enqueued: 0, processed: 0, failed: 1, schemaReady: true };
        if (error instanceof Error) console.error('Owner portal file reconciliation failed', error);
        else console.error('Owner portal file reconciliation failed with an unknown error');
    }

    try {
        phase3SettlementScheduleReconciliation = await reconcileOwnerSettlementSchedules();
    } catch (error) {
        phase3SettlementScheduleReconciliation = { synced: 0, queued: 0, failed: 1, schemaReady: true };
        if (error instanceof Error) console.error('Owner settlement schedule reconciliation failed', error);
        else console.error('Owner settlement schedule reconciliation failed with an unknown error');
    }

    const payload = await notificationResponse.json() as Record<string, unknown>;
    return Response.json({
        ...payload,
        phase3FileReconciliation,
        phase3SettlementScheduleReconciliation
    }, { status: notificationResponse.status });
}
