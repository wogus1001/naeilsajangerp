import { fail, ok } from '@/lib/api-response';
import {
    isAuthorizedUcansignWebhook,
    normalizeUcansignWebhookStatus
} from '@/lib/electronic-contracts/ucansign-webhook';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(record: Record<string, unknown>, keys: readonly string[]): string {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
        if (typeof value === 'number') return String(value);
    }
    return '';
}

type ContractStatusRow = {
    readonly id: string;
    readonly status: string | null;
};

export async function POST(request: Request) {
    try {
        if (!isAuthorizedUcansignWebhook(request, process.env.UCANSIGN_WEBHOOK_SECRET)) {
            return fail(403, 'FORBIDDEN', 'Invalid UCanSign webhook secret');
        }

        const body: unknown = await request.json();
        if (!isRecord(body)) return fail(400, 'VALIDATION_ERROR', 'Invalid webhook payload');

        const customValue = stringValue(body, ['customValue', 'custom_value']);
        const documentId = stringValue(body, ['documentId', 'document_id', 'id']);
        const rawStatus = stringValue(body, ['status', 'documentStatus', 'eventType', 'event']);
        const status = normalizeUcansignWebhookStatus(rawStatus);
        if (!customValue || !documentId) {
            return fail(400, 'VALIDATION_ERROR', 'Contract id and document id are required');
        }
        if (!status) return fail(400, 'VALIDATION_ERROR', 'Unsupported UCanSign webhook status');

        const supabaseAdmin = getSupabaseAdmin();

        const { data: contract, error: contractError } = await supabaseAdmin
            .from('electronic_contracts')
            .select('id, status')
            .eq('id', customValue)
            .eq('ucansign_document_id', documentId)
            .maybeSingle<ContractStatusRow>();
        if (contractError) throw contractError;
        if (!contract) return fail(404, 'NOT_FOUND', 'Matching electronic contract not found');

        const { error: eventError } = await supabaseAdmin.from('contract_events').insert({
            electronic_contract_id: contract.id,
            ucansign_document_id: documentId,
            event_type: rawStatus || 'webhook',
            payload: body,
            created_at: new Date().toISOString()
        });
        if (eventError) throw eventError;

        if (contract.status === 'completed' && status !== 'completed') {
            return ok({ received: true, ignored: true, reason: 'completed_contract_is_terminal' });
        }

        const updatePayload: Record<string, string> = {
            status,
            updated_at: new Date().toISOString()
        };
        if (status === 'completed') updatePayload.completed_at = new Date().toISOString();

        const { error: updateError } = await supabaseAdmin
            .from('electronic_contracts')
            .update(updatePayload)
            .eq('id', contract.id);
        if (updateError) throw updateError;

        return ok({ received: true });
    } catch (error) {
        console.error('UCanSign webhook error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to handle UCanSign webhook');
    }
}
