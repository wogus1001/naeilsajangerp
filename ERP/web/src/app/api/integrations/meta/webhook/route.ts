import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fail, ok } from '@/lib/api-response';
import {
    decryptMetaToken,
    fetchMetaLeadById,
    importMetaLeadWithLogging,
    verifyMetaWebhookSignature
} from '@/lib/meta-leads';
import { resolveMetaWebhookTarget } from '@/lib/meta-webhook-routing';

export const dynamic = 'force-dynamic';

type MetaWebhookChange = {
    field?: string;
    value?: {
        leadgen_id?: string;
        page_id?: string;
        form_id?: string;
        created_time?: number;
        [key: string]: unknown;
    };
};

type MetaWebhookPayload = {
    object?: string;
    entry?: Array<{
        id?: string;
        time?: number;
        changes?: MetaWebhookChange[];
    }>;
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token && token === process.env.META_VERIFY_TOKEN && challenge) {
        return new Response(challenge, { status: 200 });
    }

    return fail(403, 'FORBIDDEN', 'Invalid Meta webhook verification token');
}

async function processLeadgenChange(supabaseAdmin: SupabaseClient, change: MetaWebhookChange) {
    const value = change.value || {};
    const leadgenId = String(value.leadgen_id || '');
    const pageId = String(value.page_id || '');
    const formId = String(value.form_id || '');

    if (!leadgenId || !pageId || !formId) {
        return { status: 'skipped', reason: 'Missing leadgen_id/page_id/form_id' };
    }

    const { data: connections, error: connectionError } = await supabaseAdmin
        .from('meta_lead_connections')
        .select('*')
        .eq('meta_page_id', pageId)
        .eq('status', 'connected');

    if (connectionError) throw connectionError;
    if (!connections || connections.length === 0) {
        return { status: 'skipped', reason: 'No matching connection' };
    }

    const connectionIds = connections.map(connection => connection.id);
    const { data: forms, error: formError } = await supabaseAdmin
        .from('meta_lead_forms')
        .select('*')
        .in('connection_id', connectionIds)
        .eq('meta_form_id', formId)
        .eq('enabled', true);

    if (formError) throw formError;
    const target = resolveMetaWebhookTarget(connections, forms || []);
    if (target.status === 'ambiguous') {
        console.error('Meta webhook target is ambiguous for Page/Form pair');
        return { status: 'error', reason: 'Ambiguous Page/Form ownership' };
    }
    if (target.status === 'missing') {
        return { status: 'skipped', reason: 'Form is disabled or unknown' };
    }
    const connection = connections.find(item => item.id === target.connection.id);
    const form = (forms || []).find(item => item.id === target.form.id);
    if (!connection || !form) {
        return { status: 'error', reason: 'Resolved Page/Form target is unavailable' };
    }

    const pageAccessToken = decryptMetaToken(connection.access_token_encrypted);
    const lead = await fetchMetaLeadById(leadgenId, pageAccessToken);
    const result = await importMetaLeadWithLogging(supabaseAdmin, connection, form, {
        ...lead,
        leadgen_id: leadgenId,
        form_id: lead.form_id || formId
    });

    const now = new Date().toISOString();
    await Promise.all([
        supabaseAdmin
            .from('meta_lead_connections')
            .update({ last_webhook_at: now, last_error: null, updated_at: now })
            .eq('id', connection.id),
        supabaseAdmin
            .from('meta_lead_forms')
            .update({ last_error: null, updated_at: now })
            .eq('id', form.id)
    ]);

    return result;
}

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        if (!verifyMetaWebhookSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
            return fail(403, 'FORBIDDEN', 'Invalid Meta webhook signature');
        }

        const payload = JSON.parse(rawBody) as MetaWebhookPayload;
        const changes = (payload.entry || []).flatMap(entry => entry.changes || []);
        const leadgenChanges = changes.filter(change => change.field === 'leadgen');

        const supabaseAdmin = getSupabaseAdmin();
        const results = [];

        for (const change of leadgenChanges) {
            try {
                results.push(await processLeadgenChange(supabaseAdmin, change));
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown webhook change error';
                console.error('Meta webhook change error:', message);
                results.push({
                    status: 'error',
                    reason: 'Webhook change failed'
                });
            }
        }

        return ok({ received: true, processed: results.length, results });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Meta webhook error';
        console.error('Meta webhook POST error:', message);
        return fail(500, 'INTERNAL_ERROR', 'Meta 신청 정보를 처리하지 못했습니다.');
    }
}
