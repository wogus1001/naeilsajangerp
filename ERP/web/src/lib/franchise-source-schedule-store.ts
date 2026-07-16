import type { SupabaseClient } from '@supabase/supabase-js';
import type { FranchiseSourceScheduleInput } from './franchise-source-schedules';

export const FRANCHISE_SCHEDULE_UPSERT_RPC = 'upsert_franchise_schedule_from_payload';
export const FRANCHISE_OPERATIONAL_SCHEDULE_SYNC_RPC = 'sync_franchise_operational_schedule_from_payload';
export const FRANCHISE_SCHEDULE_SYNC_JOB_TABLE = 'franchise_schedule_sync_jobs';

export type FranchiseSourceSchedulePayload = {
    readonly assignee_profile_id: string | null;
    readonly color: string;
    readonly company_id: string;
    readonly completed_at: string | null;
    readonly creator_profile_id: string | null;
    readonly date: string | null;
    readonly details: string;
    readonly due_at: string | null;
    readonly id: string;
    readonly manager_profile_id: string | null;
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly remind_at: string | null;
    readonly source_id: string;
    readonly source_type: string;
    readonly status: string;
    readonly title: string;
    readonly type: string;
};

type FranchiseScheduleRpcResult = {
    readonly error: { readonly message?: string } | null;
};

type FranchiseOperationalScheduleRpcResult = {
    readonly error: { readonly message?: string } | null;
};

export type FranchiseSourceScheduleProfileCandidate = {
    readonly company_id: string | null;
    readonly id: string;
    readonly role: string | null;
    readonly status: string | null;
};

export type FranchiseScheduleRpc = (
    name: typeof FRANCHISE_SCHEDULE_UPSERT_RPC,
    args: { readonly schedule_payload: FranchiseSourceSchedulePayload }
) => Promise<FranchiseScheduleRpcResult>;

export type FranchiseOperationalScheduleRpc = (
    name: typeof FRANCHISE_OPERATIONAL_SCHEDULE_SYNC_RPC,
    args: { readonly schedule_payload: FranchiseSourceSchedulePayload }
) => Promise<FranchiseOperationalScheduleRpcResult>;

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function sanitizeFranchiseSourceScheduleProfiles(
    input: FranchiseSourceScheduleInput,
    profiles: readonly FranchiseSourceScheduleProfileCandidate[]
): FranchiseSourceScheduleInput {
    const activeProfileIds = new Set(
        profiles
            .filter(profile => (
                profile.company_id === input.companyId
                && profile.status === 'active'
                && profile.role !== 'partner_vendor'
            ))
            .map(profile => profile.id)
    );
    const managerProfileIds = new Set(
        profiles
            .filter(profile => (
                profile.company_id === input.companyId
                && profile.status === 'active'
                && (profile.role === 'admin' || profile.role === 'manager')
            ))
            .map(profile => profile.id)
    );
    const assigneeProfileId = cleanText(input.assigneeProfileId);
    const managerProfileId = cleanText(input.managerProfileId);
    const userId = cleanText(input.userId);

    return {
        ...input,
        assigneeProfileId: activeProfileIds.has(assigneeProfileId) ? assigneeProfileId : null,
        managerProfileId: managerProfileIds.has(managerProfileId) ? managerProfileId : null,
        userId: activeProfileIds.has(userId) ? userId : null
    };
}

async function fetchScheduleProfileCandidates(
    supabaseAdmin: SupabaseClient,
    input: FranchiseSourceScheduleInput
): Promise<readonly FranchiseSourceScheduleProfileCandidate[]> {
    const profileIds = [...new Set([
        cleanText(input.assigneeProfileId),
        cleanText(input.managerProfileId),
        cleanText(input.userId)
    ].filter(Boolean))];
    if (profileIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, company_id, role, status')
        .eq('company_id', input.companyId)
        .in('id', profileIds)
        .returns<FranchiseSourceScheduleProfileCandidate[]>();
    if (error) throw error;
    return data || [];
}

export function buildFranchiseSourceSchedulePayload(
    input: FranchiseSourceScheduleInput
): FranchiseSourceSchedulePayload | null {
    const sourceType = cleanText(input.sourceType);
    const sourceId = cleanText(input.sourceId);
    if (!sourceType || !sourceId) return null;

    return {
        assignee_profile_id: input.assigneeProfileId || input.userId || null,
        color: input.color || '#3182f6',
        company_id: input.companyId,
        completed_at: input.completedAt || null,
        creator_profile_id: input.userId || input.assigneeProfileId || null,
        date: input.date || null,
        details: input.details || '',
        due_at: input.dueAt || null,
        id: `${sourceType}:${sourceId}`,
        manager_profile_id: input.managerProfileId || null,
        metadata: input.metadata || {},
        remind_at: input.remindAt || null,
        source_id: sourceId,
        source_type: sourceType,
        status: input.status || '예정',
        title: input.title,
        type: input.type || 'workflow'
    };
}

export async function executeFranchiseSourceScheduleUpsert(
    input: FranchiseSourceScheduleInput,
    rpc: FranchiseScheduleRpc
): Promise<void> {
    const schedulePayload = buildFranchiseSourceSchedulePayload(input);
    if (!schedulePayload) return;

    const { error } = await rpc(FRANCHISE_SCHEDULE_UPSERT_RPC, {
        schedule_payload: schedulePayload
    });
    if (error) throw new Error(error.message || 'Franchise source schedule upsert failed');
}

export async function upsertFranchiseSourceSchedule(
    supabaseAdmin: SupabaseClient,
    input: FranchiseSourceScheduleInput
): Promise<FranchiseSourceScheduleInput> {
    const sanitizedInput = await prepareFranchiseSourceSchedule(supabaseAdmin, input);
    await executeFranchiseSourceScheduleUpsert(sanitizedInput, async (name, args) => {
        const { error } = await supabaseAdmin.rpc(name, args);
        return { error };
    });
    return sanitizedInput;
}

export async function prepareFranchiseSourceSchedule(
    supabaseAdmin: SupabaseClient,
    input: FranchiseSourceScheduleInput
): Promise<FranchiseSourceScheduleInput> {
    const profiles = await fetchScheduleProfileCandidates(supabaseAdmin, input);
    return sanitizeFranchiseSourceScheduleProfiles(input, profiles);
}

export async function executeFranchiseOperationalScheduleSync(
    input: FranchiseSourceScheduleInput,
    rpc: FranchiseOperationalScheduleRpc
): Promise<FranchiseSourceSchedulePayload | null> {
    const schedulePayload = buildFranchiseSourceSchedulePayload(input);
    if (!schedulePayload) return null;
    const { error } = await rpc(FRANCHISE_OPERATIONAL_SCHEDULE_SYNC_RPC, {
        schedule_payload: schedulePayload
    });
    if (error) throw new Error(error.message || 'Franchise operational schedule sync failed');
    return schedulePayload;
}

export async function enqueueFranchiseScheduleSync(
    supabaseAdmin: SupabaseClient,
    schedulePayload: FranchiseSourceSchedulePayload,
    error: unknown
): Promise<void> {
    const now = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const { error: queueError } = await supabaseAdmin
        .from(FRANCHISE_SCHEDULE_SYNC_JOB_TABLE)
        .upsert({
            company_id: schedulePayload.company_id,
            source_type: schedulePayload.source_type,
            source_id: schedulePayload.source_id,
            schedule_payload: schedulePayload,
            status: 'pending',
            available_at: now,
            last_error: errorMessage.slice(0, 1000),
            updated_at: now
        }, { onConflict: 'company_id,source_type,source_id' });
    if (queueError) throw queueError;
}
