import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FranchiseNotificationCandidate } from './franchise-notifications';
import {
    buildWorkflowNotificationSourceId,
    dateKeyFromScheduleValue,
    normalizeWorkflowScheduleStatus,
    type ApprovalDocumentEventType,
    type ApprovalDocumentStatus,
    type WorkflowScheduleStatus
} from './franchise-workflow';

export type JsonRecord = Record<string, unknown>;

export type WorkflowScheduleRow = {
    readonly id: string;
    readonly company_id: string;
    readonly title: string | null;
    readonly date: string | null;
    readonly scope: string | null;
    readonly status: string | null;
    readonly type: string | null;
    readonly color: string | null;
    readonly details: string | null;
    readonly user_id: string | null;
    readonly source_type: string | null;
    readonly source_id: string | null;
    readonly assignee_profile_id: string | null;
    readonly manager_profile_id: string | null;
    readonly due_at: string | null;
    readonly remind_at: string | null;
    readonly completed_at: string | null;
    readonly metadata: unknown;
    readonly created_at: string;
    readonly updated_at: string | null;
};

export type ApprovalTemplateRow = {
    readonly id: string;
    readonly company_id: string;
    readonly name: string;
    readonly description: string;
    readonly document_type: string;
    readonly fields: unknown;
    readonly approver_profile_ids: unknown;
    readonly completion_rule: unknown;
    readonly active: boolean;
    readonly created_by: string | null;
    readonly updated_by: string | null;
    readonly created_at: string;
    readonly updated_at: string;
};

export type ApprovalDocumentRow = {
    readonly id: string;
    readonly company_id: string;
    readonly template_id: string | null;
    readonly source_type: string | null;
    readonly source_id: string | null;
    readonly title: string;
    readonly status: string;
    readonly author_profile_id: string | null;
    readonly approver_profile_id: string | null;
    readonly reviewer_profile_id: string | null;
    readonly values: unknown;
    readonly reject_reason: string | null;
    readonly submitted_at: string | null;
    readonly reviewed_at: string | null;
    readonly completed_at: string | null;
    readonly data: unknown;
    readonly created_by: string | null;
    readonly updated_by: string | null;
    readonly created_at: string;
    readonly updated_at: string;
};

export type ApprovalDocumentEventRow = {
    readonly id: string;
    readonly company_id: string;
    readonly document_id: string;
    readonly event_type: string;
    readonly actor_profile_id: string | null;
    readonly from_status: string | null;
    readonly to_status: string | null;
    readonly memo: string;
    readonly data: unknown;
    readonly created_at: string;
};

export type WorkflowScheduleUpsertInput = {
    readonly companyId: string;
    readonly scheduleId?: string | null;
    readonly sourceType?: string | null;
    readonly sourceId?: string | null;
    readonly title: string;
    readonly date?: string | null;
    readonly status?: WorkflowScheduleStatus | string | null;
    readonly type?: string | null;
    readonly details?: string | null;
    readonly color?: string | null;
    readonly assigneeProfileId?: string | null;
    readonly managerProfileId?: string | null;
    readonly userId?: string | null;
    readonly dueAt?: string | null;
    readonly remindAt?: string | null;
    readonly completedAt?: string | null;
    readonly metadata?: JsonRecord;
};

export type ApprovalDocumentUpsertInput = {
    readonly companyId: string;
    readonly templateId?: string | null;
    readonly sourceType?: string | null;
    readonly sourceId?: string | null;
    readonly title: string;
    readonly status: ApprovalDocumentStatus;
    readonly authorProfileId?: string | null;
    readonly approverProfileId?: string | null;
    readonly reviewerProfileId?: string | null;
    readonly values?: JsonRecord;
    readonly rejectReason?: string | null;
    readonly data?: JsonRecord;
    readonly actorProfileId?: string | null;
};

export type ApprovalDocumentEventInput = {
    readonly companyId: string;
    readonly documentId: string;
    readonly eventType: ApprovalDocumentEventType;
    readonly actorProfileId: string | null;
    readonly fromStatus: string | null;
    readonly toStatus: string;
    readonly memo?: string | null;
    readonly data?: JsonRecord;
};

function isJsonRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
    return isJsonRecord(value) ? value : {};
}

function textField(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isUniqueConflict(error: unknown): boolean {
    if (!isJsonRecord(error)) return false;
    const code = textField(error.code);
    const message = textField(error.message);
    return code === '23505' ||
        message.includes('idx_schedules_source_unique') ||
        message.includes('idx_approval_documents_source_unique');
}

function buildScheduleDate(input: WorkflowScheduleUpsertInput): string {
    return input.date || dateKeyFromScheduleValue(input.dueAt) || dateKeyFromScheduleValue(new Date()) || '';
}

function buildSchedulePayload(input: WorkflowScheduleUpsertInput, now: string) {
    return {
        company_id: input.companyId,
        user_id: input.userId || input.assigneeProfileId || null,
        title: input.title,
        date: buildScheduleDate(input),
        scope: 'company',
        status: normalizeWorkflowScheduleStatus(input.status),
        type: input.type || 'workflow',
        color: input.color || '#3182f6',
        details: input.details || '',
        source_type: input.sourceType || null,
        source_id: input.sourceId || null,
        assignee_profile_id: input.assigneeProfileId || input.userId || null,
        manager_profile_id: input.managerProfileId || null,
        due_at: input.dueAt || null,
        remind_at: input.remindAt || null,
        completed_at: input.completedAt || null,
        metadata: input.metadata || {},
        updated_at: now
    };
}

async function updateWorkflowScheduleById(
    supabaseAdmin: SupabaseClient,
    scheduleId: string,
    companyId: string,
    payload: ReturnType<typeof buildSchedulePayload>
): Promise<WorkflowScheduleRow> {
    const { data, error } = await supabaseAdmin
        .from('schedules')
        .update(payload)
        .eq('id', scheduleId)
        .eq('company_id', companyId)
        .select('*')
        .single<WorkflowScheduleRow>();
    if (error || !data) throw error || new Error('Workflow schedule update failed');
    return data;
}

async function findWorkflowScheduleIdBySource(
    supabaseAdmin: SupabaseClient,
    input: WorkflowScheduleUpsertInput
): Promise<string | null> {
    const sourceType = input.sourceType || '';
    const sourceId = input.sourceId || '';
    if (!sourceType || !sourceId) return null;

    const { data, error } = await supabaseAdmin
        .from('schedules')
        .select('id')
        .eq('company_id', input.companyId)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .maybeSingle<{ readonly id: string }>();
    if (error) throw error;
    return data?.id || null;
}

export async function upsertWorkflowSchedule(
    supabaseAdmin: SupabaseClient,
    input: WorkflowScheduleUpsertInput
): Promise<WorkflowScheduleRow> {
    const now = new Date().toISOString();
    const payload = buildSchedulePayload(input, now);
    const sourceType = input.sourceType || '';
    const sourceId = input.sourceId || '';

    if (sourceType && sourceId) {
        const existingId = await findWorkflowScheduleIdBySource(supabaseAdmin, input);
        if (existingId) return updateWorkflowScheduleById(supabaseAdmin, existingId, input.companyId, payload);
    }

    if (input.scheduleId) {
        const { data: existingById, error: findByIdError } = await supabaseAdmin
            .from('schedules')
            .select('id, company_id, source_type, source_id')
            .eq('id', input.scheduleId)
            .eq('company_id', input.companyId)
            .maybeSingle<{ readonly id: string; readonly company_id: string; readonly source_type: string | null; readonly source_id: string | null }>();
        if (findByIdError) throw findByIdError;
        if (existingById?.id) {
            if (
                existingById.source_type &&
                (existingById.source_type !== sourceType || existingById.source_id !== sourceId)
            ) {
                throw new Error('WORKFLOW_SCHEDULE_SOURCE_MISMATCH');
            }
            return updateWorkflowScheduleById(supabaseAdmin, existingById.id, input.companyId, payload);
        }
    }

    const { data, error } = await supabaseAdmin
        .from('schedules')
        .insert({ id: input.scheduleId || randomUUID(), created_at: now, ...payload })
        .select('*')
        .single<WorkflowScheduleRow>();
    if (error && sourceType && sourceId && isUniqueConflict(error)) {
        const existingId = await findWorkflowScheduleIdBySource(supabaseAdmin, input);
        if (existingId) return updateWorkflowScheduleById(supabaseAdmin, existingId, input.companyId, payload);
    }
    if (error || !data) throw error || new Error('Workflow schedule insert failed');
    return data;
}

export async function completeWorkflowSchedule(
    supabaseAdmin: SupabaseClient,
    input: {
        readonly companyId: string;
        readonly scheduleId?: string | null;
        readonly sourceType?: string | null;
        readonly sourceId?: string | null;
        readonly completedAt?: string | null;
    }
): Promise<void> {
    const completedAt = input.completedAt || new Date().toISOString();
    const query = supabaseAdmin
        .from('schedules')
        .update({ status: '완료', completed_at: completedAt, updated_at: completedAt })
        .eq('company_id', input.companyId);

    if (input.scheduleId) {
        const { error } = await query.eq('id', input.scheduleId);
        if (error) throw error;
        return;
    }

    if (input.sourceType && input.sourceId) {
        const { error } = await query.eq('source_type', input.sourceType).eq('source_id', input.sourceId);
        if (error) throw error;
    }
}

export async function createWorkflowNotifications(
    supabaseAdmin: SupabaseClient,
    candidates: readonly FranchiseNotificationCandidate[]
): Promise<void> {
    if (candidates.length === 0) return;
    const now = new Date().toISOString();
    const rows = candidates.map(candidate => ({
        company_id: candidate.companyId,
        recipient_profile_id: candidate.recipientProfileId,
        source_type: candidate.sourceType,
        source_id: candidate.sourceId,
        lead_id: candidate.leadId,
        severity: candidate.severity,
        title: candidate.title,
        body: candidate.body,
        action_url: candidate.actionUrl,
        due_at: candidate.dueAt,
        delivery_channel: 'in_app',
        kakao_template_key: '',
        data: candidate.data,
        updated_at: now
    }));
    const { error } = await supabaseAdmin
        .from('franchise_notifications')
        .upsert(rows, { onConflict: 'company_id,recipient_profile_id,source_type,source_id' });
    if (error) throw error;
}

export function buildWorkflowNotification(input: {
    readonly companyId: string;
    readonly recipientProfileId: string;
    readonly sourceType: FranchiseNotificationCandidate['sourceType'];
    readonly sourceId: string;
    readonly eventKey: string;
    readonly severity: FranchiseNotificationCandidate['severity'];
    readonly title: string;
    readonly body: string;
    readonly actionUrl: string;
    readonly dueAt?: string | null;
    readonly data?: JsonRecord;
}): FranchiseNotificationCandidate {
    return {
        companyId: input.companyId,
        recipientProfileId: input.recipientProfileId,
        sourceType: input.sourceType,
        sourceId: buildWorkflowNotificationSourceId(input.sourceId, input.eventKey),
        leadId: null,
        severity: input.severity,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
        dueAt: input.dueAt || null,
        data: input.data || {}
    };
}

export async function fetchWorkflowManagerProfileIds(
    supabaseAdmin: SupabaseClient,
    companyId: string
): Promise<readonly string[]> {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .in('role', ['admin', 'manager'])
        .returns<Array<{ readonly id: string }>>();
    if (error) throw error;
    return (data || []).map(profile => profile.id);
}

function buildApprovalDocumentPayload(input: ApprovalDocumentUpsertInput, now: string, existing?: ApprovalDocumentRow | null) {
    const submittedAt = input.status === '제출' ? now : existing?.submitted_at || null;
    const reviewedAt = input.status === '승인' || input.status === '반려' ? now : existing?.reviewed_at || null;
    const completedAt = input.status === '완료처리' ? now : existing?.completed_at || null;

    return {
        company_id: input.companyId,
        template_id: input.templateId || existing?.template_id || null,
        source_type: input.sourceType || existing?.source_type || null,
        source_id: input.sourceId || existing?.source_id || null,
        title: input.title,
        status: input.status,
        author_profile_id: input.authorProfileId || existing?.author_profile_id || null,
        approver_profile_id: input.approverProfileId || existing?.approver_profile_id || null,
        reviewer_profile_id: input.reviewerProfileId || existing?.reviewer_profile_id || null,
        values: input.values || asRecord(existing?.values),
        reject_reason: input.rejectReason || null,
        submitted_at: submittedAt,
        reviewed_at: reviewedAt,
        completed_at: completedAt,
        data: input.data || asRecord(existing?.data),
        updated_by: input.actorProfileId || null,
        updated_at: now
    };
}

async function updateApprovalDocumentById(
    supabaseAdmin: SupabaseClient,
    documentId: string,
    payload: ReturnType<typeof buildApprovalDocumentPayload>
): Promise<ApprovalDocumentRow> {
    const { data, error } = await supabaseAdmin
        .from('approval_documents')
        .update(payload)
        .eq('id', documentId)
        .select('*')
        .single<ApprovalDocumentRow>();
    if (error || !data) throw error || new Error('Approval document update failed');
    return data;
}

async function findApprovalDocumentBySource(
    supabaseAdmin: SupabaseClient,
    input: ApprovalDocumentUpsertInput
): Promise<ApprovalDocumentRow | null> {
    const sourceType = input.sourceType || '';
    const sourceId = input.sourceId || '';
    if (!sourceType || !sourceId) return null;

    const { data, error } = await supabaseAdmin
        .from('approval_documents')
        .select('*')
        .eq('company_id', input.companyId)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .maybeSingle<ApprovalDocumentRow>();
    if (error) throw error;
    return data || null;
}

export async function upsertApprovalDocumentForSource(
    supabaseAdmin: SupabaseClient,
    input: ApprovalDocumentUpsertInput
): Promise<ApprovalDocumentRow> {
    const now = new Date().toISOString();
    const sourceType = input.sourceType || '';
    const sourceId = input.sourceId || '';
    let existing: ApprovalDocumentRow | null = null;

    if (sourceType && sourceId) {
        existing = await findApprovalDocumentBySource(supabaseAdmin, input);
    }

    const payload = buildApprovalDocumentPayload(input, now, existing);
    if (existing) return updateApprovalDocumentById(supabaseAdmin, existing.id, payload);

    const { data, error } = await supabaseAdmin
        .from('approval_documents')
        .insert({ id: randomUUID(), created_by: input.actorProfileId || null, created_at: now, ...payload })
        .select('*')
        .single<ApprovalDocumentRow>();
    if (error && sourceType && sourceId && isUniqueConflict(error)) {
        const existingAfterConflict = await findApprovalDocumentBySource(supabaseAdmin, input);
        if (existingAfterConflict) {
            const retryPayload = buildApprovalDocumentPayload(input, new Date().toISOString(), existingAfterConflict);
            return updateApprovalDocumentById(supabaseAdmin, existingAfterConflict.id, retryPayload);
        }
    }
    if (error || !data) throw error || new Error('Approval document insert failed');
    return data;
}

export async function insertApprovalDocumentEvent(
    supabaseAdmin: SupabaseClient,
    input: ApprovalDocumentEventInput
): Promise<ApprovalDocumentEventRow> {
    const { data, error } = await supabaseAdmin
        .from('approval_document_events')
        .insert({
            company_id: input.companyId,
            document_id: input.documentId,
            event_type: input.eventType,
            actor_profile_id: input.actorProfileId,
            from_status: input.fromStatus,
            to_status: input.toStatus,
            memo: input.memo || '',
            data: input.data || {}
        })
        .select('*')
        .single<ApprovalDocumentEventRow>();
    if (error || !data) throw error || new Error('Approval document event insert failed');
    return data;
}
