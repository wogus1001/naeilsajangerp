import { fail, ok } from '@/lib/api-response';
import {
    extractUcansignWebhookPayloadInfo,
    isAuthorizedUcansignWebhook,
    normalizeUcansignWebhookStatus
} from '@/lib/electronic-contracts/ucansign-webhook';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type ContractStatusRow = {
    readonly id: string;
    readonly status: string | null;
};

async function findContractByWebhookPayload(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    contractId: string,
    documentId: string
): Promise<ContractStatusRow | null> {
    if (contractId) {
        const { data, error } = await supabaseAdmin
            .from('electronic_contracts')
            .select('id, status')
            .eq('id', contractId)
            .eq('ucansign_document_id', documentId)
            .maybeSingle<ContractStatusRow>();
        if (error) throw error;
        if (data) return data;
    }

    const { data, error } = await supabaseAdmin
        .from('electronic_contracts')
        .select('id, status')
        .eq('ucansign_document_id', documentId)
        .maybeSingle<ContractStatusRow>();
    if (error) throw error;
    return data || null;
}

export async function POST(request: Request) {
    try {
        if (!isAuthorizedUcansignWebhook(request, process.env.UCANSIGN_WEBHOOK_SECRET)) {
            return fail(403, 'FORBIDDEN', 'Invalid UCanSign webhook secret');
        }

        const body: unknown = await request.json();
        if (!isRecord(body)) return fail(400, 'VALIDATION_ERROR', 'Invalid webhook payload');

        const { contractId, documentId, rawStatus } = extractUcansignWebhookPayloadInfo(body);
        const status = normalizeUcansignWebhookStatus(rawStatus);
        if (!documentId) {
            return fail(400, 'VALIDATION_ERROR', 'Document id is required');
        }
        if (!status) return fail(400, 'VALIDATION_ERROR', 'Unsupported UCanSign webhook status');

        const supabaseAdmin = getSupabaseAdmin();
        const contract = await findContractByWebhookPayload(supabaseAdmin, contractId, documentId);
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
