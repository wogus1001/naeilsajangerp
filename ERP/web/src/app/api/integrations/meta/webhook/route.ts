import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fail, ok } from '@/lib/api-response';
import {
    decryptMetaToken,
    fetchMetaLeadById,
    importMetaLeadWithLogging,
    verifyMetaWebhookSignature
} from '@/lib/meta-leads';

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

async function processLeadgenChange(supabaseAdmin: any, change: MetaWebhookChange) {
    const value = change.value || {};
    const leadgenId = String(value.leadgen_id || '');
    const pageId = String(value.page_id || '');
    const formId = String(value.form_id || '');

    if (!leadgenId || !pageId || !formId) {
        return { status: 'skipped', reason: 'Missing leadgen_id/page_id/form_id' };
    }

    const { data: connection, error: connectionError } = await supabaseAdmin
        .from('meta_lead_connections')
        .select('*')
        .eq('meta_page_id', pageId)
        .neq('status', 'disconnected')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (connectionError) throw connectionError;
    if (!connection) {
        return { status: 'skipped', reason: 'No matching connection' };
    }

    const { data: form, error: formError } = await supabaseAdmin
        .from('meta_lead_forms')
        .select('*')
        .eq('connection_id', connection.id)
        .eq('meta_form_id', formId)
        .eq('enabled', true)
        .maybeSingle();

    if (formError) throw formError;
    if (!form) {
        await supabaseAdmin
            .from('meta_lead_connections')
            .update({
                last_error: `Webhook received for disabled or unknown form ${formId}`,
                last_webhook_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', connection.id);

        return { status: 'skipped', reason: 'Form is disabled or unknown' };
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
                console.error('Meta webhook change error:', error);
                results.push({
                    status: 'error',
                    reason: error instanceof Error ? error.message : 'Webhook change failed'
                });
            }
        }

        return ok({ received: true, processed: results.length, results });
    } catch (error) {
        console.error('Meta webhook POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to process Meta webhook');
    }
}
