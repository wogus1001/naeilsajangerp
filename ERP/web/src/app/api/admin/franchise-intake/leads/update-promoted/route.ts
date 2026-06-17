import { getRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { normalizeLeadPhone } from '@/lib/franchise-leads';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type Payload = {
    readonly leadId: string;
    readonly requesterId: string | null;
};

type RequestRow = {
    readonly id: string;
    readonly company_id: string;
    readonly manager_id: string | null;
    readonly name: string | null;
    readonly mobile: string | null;
    readonly source: string | null;
    readonly status: string | null;
    readonly grade: string | null;
    readonly desired_region: string | null;
    readonly interested_brand: string | null;
    readonly budget_min: number | null;
    readonly budget_max: number | null;
    readonly memo: string | null;
    readonly next_contact_at: string | null;
    readonly promoted_lead_id: string | null;
    readonly data: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
    const value = record[key];
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function parsePayload(value: unknown): Payload | null {
    if (!isRecord(value)) return null;
    const leadId = readString(value, 'leadId');
    if (!leadId) return null;
    return { leadId, requesterId: readString(value, 'requesterId') };
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const payload = parsePayload(await request.json());
        if (!payload) return fail(400, 'VALIDATION_ERROR', 'Invalid lead update payload');

        const requester = await getRequesterProfile(supabaseAdmin, request, payload.requesterId);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const { data: source, error: sourceError } = await supabaseAdmin
            .from('franchise_lead_registration_requests')
            .select('id, company_id, manager_id, name, mobile, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, next_contact_at, promoted_lead_id, data')
            .eq('id', payload.leadId)
            .maybeSingle<RequestRow>();
        if (sourceError) throw sourceError;
        if (!source?.promoted_lead_id) return fail(404, 'NOT_FOUND', 'Promoted lead not found');

        const nowIso = new Date().toISOString();
        const nextData = {
            ...(source.data || {}),
            leadStage: 'candidate',
            sourceType: 'franchise_lead_registration',
            adminIntakeStatus: 'promoted',
            leadRegistrationRequestId: source.id,
            intakeUpdatedAt: nowIso
        };

        const { data: lead, error: leadError } = await supabaseAdmin
            .from('franchise_leads')
            .update({
                company_id: source.company_id,
                manager_id: source.manager_id,
                name: source.name || '이름 없음',
                mobile: source.mobile,
                mobile_normalized: normalizeLeadPhone(source.mobile) || null,
                source: source.source,
                status: source.status || '문의접수',
                grade: source.grade,
                desired_region: source.desired_region,
                budget_min: source.budget_min,
                budget_max: source.budget_max,
                interested_brand: source.interested_brand,
                memo: source.memo,
                next_contact_at: source.next_contact_at,
                data: nextData,
                updated_at: nowIso
            })
            .eq('id', source.promoted_lead_id)
            .select()
            .single();
        if (leadError) throw leadError;

        const { error: requestError } = await supabaseAdmin
            .from('franchise_lead_registration_requests')
            .update({ promoted_at: nowIso, data: nextData, updated_at: nowIso })
            .eq('id', source.id);
        if (requestError) throw requestError;
        return ok({ lead });
    } catch (error) {
        console.error('Admin promoted lead update POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to update promoted lead');
    }
}
