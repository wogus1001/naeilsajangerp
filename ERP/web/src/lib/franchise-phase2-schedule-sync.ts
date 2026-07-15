import type { SupabaseClient } from '@supabase/supabase-js';
import { buildOwnerSubmissionSourceSchedule } from './franchise-phase2-source-schedules';
import { upsertFranchiseSourceSchedule } from './franchise-source-schedule-store';
import type { FranchiseSourceScheduleInput } from './franchise-source-schedules';
import { buildWorkflowNotificationSourceId } from './franchise-workflow';
import {
    buildWorkflowNotification,
    createWorkflowNotifications,
    fetchWorkflowManagerProfileIds
} from './franchise-workflow-store';

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

function metadataText(schedule: FranchiseSourceScheduleInput, key: string): string {
    const value = schedule.metadata?.[key];
    return typeof value === 'string' ? value.trim() : '';
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
): Promise<void> {
    const safeSchedule = await upsertFranchiseSourceSchedule(supabaseAdmin, schedule);
    const notificationSourceId = buildWorkflowNotificationSourceId(
        `${safeSchedule.sourceType}:${safeSchedule.sourceId}`,
        'active'
    );
    if (safeSchedule.status === '완료' || safeSchedule.status === '취소') {
        const now = new Date().toISOString();
        const { error } = await supabaseAdmin
            .from('franchise_notifications')
            .update({ dismissed_at: now, updated_at: now })
            .eq('company_id', safeSchedule.companyId)
            .eq('source_type', 'workflow-schedule')
            .eq('source_id', notificationSourceId);
        if (error) throw error;
        return;
    }
    const recipients = [...new Set([
        safeSchedule.assigneeProfileId,
        safeSchedule.managerProfileId,
        safeSchedule.userId
    ].filter((profileId): profileId is string => Boolean(profileId)))];
    const now = new Date().toISOString();
    const { error: dismissalError } = await supabaseAdmin
        .from('franchise_notifications')
        .update({ dismissed_at: now, updated_at: now })
        .eq('company_id', safeSchedule.companyId)
        .eq('source_type', 'workflow-schedule')
        .eq('source_id', notificationSourceId);
    if (dismissalError) throw dismissalError;
    await createWorkflowNotifications(supabaseAdmin, recipients.map(recipientProfileId => buildWorkflowNotification({
        actionUrl: metadataText(safeSchedule, 'actionUrl') || '/dashboard/franchise-operations/schedule',
        body: safeSchedule.details || `${safeSchedule.title} 일정을 확인해주세요.`,
        companyId: safeSchedule.companyId,
        data: { sourceId: safeSchedule.sourceId, sourceType: safeSchedule.sourceType },
        dueAt: safeSchedule.dueAt,
        eventKey: 'active',
        recipientProfileId,
        severity: safeSchedule.status === '지연' ? 'danger' : 'info',
        sourceId: `${safeSchedule.sourceType}:${safeSchedule.sourceId}`,
        sourceType: 'workflow-schedule',
        title: safeSchedule.status === '지연' ? `지연 일정: ${safeSchedule.title}` : safeSchedule.title
    })));
    if (recipients.length === 0) return;
    const { error: reactivationError } = await supabaseAdmin
        .from('franchise_notifications')
        .update({ dismissed_at: null, read_at: null, updated_at: now })
        .eq('company_id', safeSchedule.companyId)
        .eq('source_type', 'workflow-schedule')
        .eq('source_id', notificationSourceId)
        .in('recipient_profile_id', recipients);
    if (reactivationError) throw reactivationError;
}

export async function safelySyncOwnerSubmissionSchedule(
    input: OwnerSubmissionScheduleSyncInput
): Promise<void> {
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
        const schedule = buildOwnerSubmissionSourceSchedule({
            companyId: input.companyId,
            locationName: input.locationName,
            managerProfileId: managerCandidates.find(profileId => activeManagerIds.has(profileId)) || null,
            status: input.status,
            submissionId: input.submissionId,
            submissionType: input.submissionType,
            submittedAt: input.submittedAt,
            title: input.title
        });
        if (schedule) await syncFranchiseOperationalSchedule(input.supabaseAdmin, schedule);
    } catch (error) {
        console.warn('Optional owner submission franchise schedule sync skipped:', error);
    }
}
