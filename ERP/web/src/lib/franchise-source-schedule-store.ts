import type { SupabaseClient } from '@supabase/supabase-js';
import type { FranchiseSourceScheduleInput } from './franchise-source-schedules';

export const FRANCHISE_SCHEDULE_UPSERT_RPC = 'upsert_franchise_schedule_from_payload';

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

export type FranchiseScheduleRpc = (
    name: typeof FRANCHISE_SCHEDULE_UPSERT_RPC,
    args: { readonly schedule_payload: FranchiseSourceSchedulePayload }
) => Promise<FranchiseScheduleRpcResult>;

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
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
): Promise<void> {
    await executeFranchiseSourceScheduleUpsert(input, async (name, args) => {
        const { error } = await supabaseAdmin.rpc(name, args);
        return { error };
    });
}
