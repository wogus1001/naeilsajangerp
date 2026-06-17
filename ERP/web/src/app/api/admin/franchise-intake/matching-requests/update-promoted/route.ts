import { getRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildFranchiseMatchingRequestPromotionDraft,
    buildMatchingRequestSourcePromotionData,
    type FranchiseMatchingRequestPromotionRow
} from '@/lib/franchise-matching-request-promotion';
import { FRANCHISE_MATCHING_REQUEST_SOURCE } from '@/lib/franchise-leads';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type Payload = {
    readonly leadId: string;
    readonly requesterId: string | null;
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

function readDataString(data: Record<string, unknown> | null, key: string): string {
    const value = data?.[key];
    return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const payload = parsePayload(await request.json());
        if (!payload) return fail(400, 'VALIDATION_ERROR', 'Invalid matching request update payload');

        const requester = await getRequesterProfile(supabaseAdmin, request, payload.requesterId);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const { data: source, error: sourceError } = await supabaseAdmin
            .from('franchise_leads')
            .select('id, company_id, manager_id, name, mobile, mobile_normalized, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, next_contact_at, created_at, updated_at, data')
            .eq('id', payload.leadId)
            .maybeSingle<FranchiseMatchingRequestPromotionRow>();
        if (sourceError) throw sourceError;
        if (!source) return fail(404, 'NOT_FOUND', 'Matching request not found');
        if (source.source !== FRANCHISE_MATCHING_REQUEST_SOURCE) {
            return fail(400, 'VALIDATION_ERROR', 'Only matching request leads can be updated');
        }

        const promotedLeadId = readDataString(source.data, 'matchingRequestPromotedLeadId');
        if (!promotedLeadId) return fail(404, 'NOT_FOUND', 'Promoted lead not found');

        const targetCompanyId = readDataString(source.data, 'matchingRequestPromotedCompanyId') || source.company_id;
        if (!targetCompanyId) return fail(400, 'VALIDATION_ERROR', 'Target company is required');

        const selectedManagerId = readDataString(source.data, 'matchingRequestPromotedManagerId') || (
            source.company_id === targetCompanyId ? source.manager_id || '' : ''
        );
        const nowIso = new Date().toISOString();
        const draft = buildFranchiseMatchingRequestPromotionDraft(source, targetCompanyId, selectedManagerId || null, nowIso);

        const { data: lead, error: leadError } = await supabaseAdmin
            .from('franchise_leads')
            .update({ ...draft, updated_at: nowIso })
            .eq('id', promotedLeadId)
            .select()
            .single();
        if (leadError) throw leadError;

        const { data: updatedSource, error: sourceUpdateError } = await supabaseAdmin
            .from('franchise_leads')
            .update({
                data: buildMatchingRequestSourcePromotionData(source.data || {}, {
                    promotedAt: nowIso,
                    promotedBy: requester.id,
                    promotedLeadId,
                    targetCompanyId,
                    targetManagerId: selectedManagerId || null
                }),
                updated_at: nowIso
            })
            .eq('id', source.id)
            .select()
            .single();
        if (sourceUpdateError) throw sourceUpdateError;

        return ok({ request: updatedSource, lead });
    } catch (error) {
        console.error('Admin promoted matching request update POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to update promoted matching request');
    }
}
