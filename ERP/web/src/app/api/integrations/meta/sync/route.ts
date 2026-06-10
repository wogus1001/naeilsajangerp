import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    canAccessCompanyScope,
    getRequesterProfile
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    canManageMetaIntegration,
    decryptMetaToken,
    fetchMetaFormLeads,
    importMetaLeadWithLogging
} from '@/lib/meta-leads';

export const dynamic = 'force-dynamic';

type SyncStats = {
    created: number;
    updated: number;
    duplicate: number;
    skipped: number;
    error: number;
};

function emptyStats(): SyncStats {
    return { created: 0, updated: 0, duplicate: 0, skipped: 0, error: 0 };
}

function mergeStats(target: SyncStats, result: keyof SyncStats) {
    target[result] += 1;
}

async function syncForm(supabaseAdmin: any, form: any, connection: any) {
    const stats = emptyStats();
    const pageAccessToken = decryptMetaToken(connection.access_token_encrypted);
    let after: string | undefined;
    let pages = 0;
    const MAX_PAGES = 50;

    try {
        do {
            const response = await fetchMetaFormLeads(form.meta_form_id, pageAccessToken, after);
            const leads = response.data || [];

            for (const lead of leads) {
                try {
                    const result = await importMetaLeadWithLogging(supabaseAdmin, connection, form, lead);
                    mergeStats(stats, result.status);
                } catch {
                    stats.error += 1;
                }
            }

            after = response.paging?.cursors?.after;
            pages += 1;
            if (!response.paging?.next) after = undefined;
        } while (after && pages < MAX_PAGES);

        const now = new Date().toISOString();
        await Promise.all([
            supabaseAdmin
                .from('meta_lead_forms')
                .update({ last_synced_at: now, last_error: null, updated_at: now })
                .eq('id', form.id),
            supabaseAdmin
                .from('meta_lead_connections')
                .update({ last_sync_at: now, last_error: null, updated_at: now })
                .eq('id', connection.id)
        ]);

        return stats;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Meta form sync failed';
        await Promise.all([
            supabaseAdmin
                .from('meta_lead_forms')
                .update({ last_error: message, updated_at: new Date().toISOString() })
                .eq('id', form.id),
            supabaseAdmin
                .from('meta_lead_connections')
                .update({ last_error: message, updated_at: new Date().toISOString() })
                .eq('id', connection.id)
        ]);
        throw error;
    }
}

async function syncForms(supabaseAdmin: any, forms: any[]) {
    const total = emptyStats();
    const errors: Array<{ formId: string; reason: string }> = [];

    for (const form of forms) {
        const connection = form.connection;
        if (!connection || connection.status === 'disconnected') {
            errors.push({ formId: form.id, reason: 'Connection is unavailable' });
            total.error += 1;
            continue;
        }

        try {
            const stats = await syncForm(supabaseAdmin, form, connection);
            (Object.keys(total) as Array<keyof SyncStats>).forEach(key => {
                total[key] += stats[key];
            });
        } catch (error) {
            errors.push({
                formId: form.id,
                reason: error instanceof Error ? error.message : 'Sync failed'
            });
            total.error += 1;
        }
    }

    return { stats: total, errors };
}

async function fetchEnabledForms(supabaseAdmin: any, filters: { formId?: string; companyId?: string }) {
    let query = supabaseAdmin
        .from('meta_lead_forms')
        .select('*, connection:meta_lead_connections(*)')
        .eq('enabled', true)
        .order('updated_at', { ascending: false });

    if (filters.formId) query = query.eq('id', filters.formId);
    if (filters.companyId) query = query.eq('company_id', filters.companyId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();
        const requesterProfile = await getRequesterProfile(
            supabaseAdmin,
            request,
            body.requesterId || body.userId || null
        );

        if (!requesterProfile) {
            return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        }
        if (!canManageMetaIntegration(requesterProfile)) {
            return fail(403, 'FORBIDDEN', 'Only managers can sync Meta leads');
        }

        const forms = await fetchEnabledForms(supabaseAdmin, { formId: body.formId });
        const forbidden = forms.some((form: any) => !canAccessCompanyScope(requesterProfile, form.company_id));
        if (forbidden) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company sync denied');
        }

        const result = await syncForms(supabaseAdmin, forms);
        return ok({ ...result, formCount: forms.length });
    } catch (error) {
        console.error('Meta sync POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to sync Meta leads');
    }
}

export async function GET(request: Request) {
    try {
        const secret = process.env.CRON_SECRET;
        const authHeader = request.headers.get('authorization');

        if (!secret || authHeader !== `Bearer ${secret}`) {
            return fail(401, 'AUTH_REQUIRED', 'Invalid cron secret');
        }

        const supabaseAdmin = getSupabaseAdmin();
        const forms = await fetchEnabledForms(supabaseAdmin, {});
        const result = await syncForms(supabaseAdmin, forms);
        return ok({ ...result, formCount: forms.length });
    } catch (error) {
        console.error('Meta sync GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to run scheduled Meta sync');
    }
}
