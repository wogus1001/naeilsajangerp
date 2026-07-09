import type { SupabaseClient } from '@supabase/supabase-js';
import { isFinalAlimtalkSendStatus, type AlimtalkSendStatus } from './alimtalk-send-support';

export type AlimtalkSendLogRow = {
    readonly company_id: string | null;
    readonly scenario_key: string;
    readonly template_key: string;
    readonly source_type: string;
    readonly source_id: string;
    readonly recipient_profile_id: string | null;
    readonly recipient_name: string;
    readonly recipient_phone: string;
    readonly status: AlimtalkSendStatus;
    readonly provider_message_id: string;
    readonly error_message: string;
    readonly variables: Record<string, string>;
    readonly sent_at: string;
    readonly created_at: string;
};

export type AlimtalkSendLogDedupKey = {
    readonly companyId: string;
    readonly scenarioKey: string;
    readonly sourceType: string;
    readonly sourceId: string;
    readonly recipientPhone: string;
};

export type AlimtalkSendLogPatch = Pick<
    AlimtalkSendLogRow,
    'status' | 'provider_message_id' | 'error_message' | 'variables' | 'sent_at'
>;

export type AlimtalkSendLogRepository = {
    readonly insert: (row: AlimtalkSendLogRow) => Promise<boolean>;
    readonly findStatus: (key: AlimtalkSendLogDedupKey) => Promise<AlimtalkSendStatus | null>;
    readonly updateNonFinal: (key: AlimtalkSendLogDedupKey, patch: AlimtalkSendLogPatch) => Promise<void>;
};

function getAlimtalkSendLogDedupKey(row: AlimtalkSendLogRow): AlimtalkSendLogDedupKey | null {
    if (!row.company_id || !row.source_type || !row.source_id || !row.recipient_phone) return null;
    return {
        companyId: row.company_id,
        scenarioKey: row.scenario_key,
        sourceType: row.source_type,
        sourceId: row.source_id,
        recipientPhone: row.recipient_phone
    };
}

export async function writeDuplicateSafeAlimtalkSendLog(
    repository: AlimtalkSendLogRepository,
    row: AlimtalkSendLogRow
): Promise<void> {
    const isDuplicate = await repository.insert(row);
    if (!isDuplicate) return;

    const key = getAlimtalkSendLogDedupKey(row);
    if (!key) return;

    const existingStatus = await repository.findStatus(key);
    if (existingStatus && isFinalAlimtalkSendStatus(existingStatus)) return;

    await repository.updateNonFinal(key, {
        status: row.status,
        provider_message_id: row.provider_message_id,
        error_message: row.error_message,
        variables: row.variables,
        sent_at: row.sent_at
    });
}

export function createSupabaseAlimtalkSendLogRepository(supabaseAdmin: SupabaseClient): AlimtalkSendLogRepository {
    return {
        insert: async row => {
            const { error } = await supabaseAdmin.from('alimtalk_send_logs').insert(row);
            if (!error) return false;
            if (error.code === '23505') return true;
            throw error;
        },
        findStatus: async key => {
            const { data, error } = await supabaseAdmin
                .from('alimtalk_send_logs')
                .select('status')
                .eq('company_id', key.companyId)
                .eq('scenario_key', key.scenarioKey)
                .eq('source_type', key.sourceType)
                .eq('source_id', key.sourceId)
                .eq('recipient_phone', key.recipientPhone)
                .maybeSingle<{ status: AlimtalkSendStatus }>();
            if (error) throw error;
            return data?.status ?? null;
        },
        updateNonFinal: async (key, patch) => {
            const { error } = await supabaseAdmin
                .from('alimtalk_send_logs')
                .update(patch)
                .eq('company_id', key.companyId)
                .eq('scenario_key', key.scenarioKey)
                .eq('source_type', key.sourceType)
                .eq('source_id', key.sourceId)
                .eq('recipient_phone', key.recipientPhone)
                .not('status', 'in', '("success","fallback_sms")');
            if (error) throw error;
        }
    };
}
