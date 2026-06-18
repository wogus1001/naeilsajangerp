import {
    getRequesterProfile,
    resolveUserUuid
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { canAccessFranchiseLead } from '@/lib/franchise-lead-access';
import { isMissingLeadRegistrationRequestTableError } from '@/lib/franchise-lead-registration-table';
import { DEFAULT_FRANCHISE_LEAD_STATUS, normalizeLeadPhone } from '@/lib/franchise-leads';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

type RequestRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly created_by?: string | null;
    readonly data: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
    const value: unknown = await request.json();
    return isRecord(value) ? value : {};
}

function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized || null;
}

function parseBudget(value: unknown): number | null {
    const raw = cleanString(value);
    if (!raw) return null;
    const parsed = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(parsed)) return null;
    return Math.abs(parsed) > 0 && Math.abs(parsed) < 1_000_000 ? parsed * 10_000 : parsed;
}

function buildUpdates(body: Record<string, unknown>, existingData: Record<string, unknown> | null) {
    const nowIso = new Date().toISOString();
    const mobile = cleanString(body['mobile']);
    const data = {
        ...(existingData || {}),
        requestEditedAt: nowIso
    };
    return {
        ...(Object.prototype.hasOwnProperty.call(body, 'name') ? { name: cleanString(body['name']) || '이름 없음' } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, 'mobile') ? { mobile, mobile_normalized: normalizeLeadPhone(mobile) || null } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, 'status') ? { status: cleanString(body['status']) || DEFAULT_FRANCHISE_LEAD_STATUS } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, 'grade') ? { grade: cleanString(body['grade']) } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, 'desiredRegion') ? { desired_region: cleanString(body['desiredRegion']) } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, 'budgetMin') ? { budget_min: parseBudget(body['budgetMin']) } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, 'budgetMax') ? { budget_max: parseBudget(body['budgetMax']) } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, 'interestedBrand') ? { interested_brand: cleanString(body['interestedBrand']) } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, 'memo') ? { memo: cleanString(body['memo']) } : {}),
        updated_at: nowIso,
        data
    };
}

async function validateManager(body: Record<string, unknown>, companyId: string | null) {
    const managerId = cleanString(body['managerId']);
    if (!managerId) return null;
    const supabaseAdmin = getSupabaseAdmin();
    const managerUuid = await resolveUserUuid(supabaseAdmin, managerId);
    if (!managerUuid) return { error: fail(400, 'VALIDATION_ERROR', 'Invalid managerId') };
    const { data: manager, error } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', managerUuid)
        .maybeSingle<{ readonly company_id: string | null }>();
    if (error) throw error;
    if (!manager || manager.company_id !== companyId) {
        return { error: fail(403, 'FORBIDDEN', 'Forbidden: manager/company mismatch') };
    }
    return { managerId: managerUuid };
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        const params = await context.params;
        const supabaseAdmin = getSupabaseAdmin();
        const body = await parseBody(request);
        const requester = await getRequesterProfile(supabaseAdmin, request, cleanString(body['requesterId']));
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('franchise_lead_registration_requests')
            .select('id, company_id, manager_id, created_by, data')
            .eq('id', params.id)
            .maybeSingle<RequestRow>();

        if (fetchError && !isMissingLeadRegistrationRequestTableError(fetchError)) throw fetchError;
        const row = existing || await fetchFallbackRow(params.id);
        if (!row) return fail(404, 'NOT_FOUND', 'Lead registration request not found');
        const targetTable = existing ? 'franchise_lead_registration_requests' : 'franchise_leads';
        const hasAccess = canAccessFranchiseLead(requester, row);
        if (!hasAccess) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company update denied');

        const managerValidation = await validateManager(body, row.company_id);
        if (managerValidation?.error) return managerValidation.error;
        const updates = {
            ...buildUpdates(body, row.data),
            ...(managerValidation?.managerId ? { manager_id: managerValidation.managerId } : {})
        };

        const { data: updated, error: updateError } = await supabaseAdmin
            .from(targetTable)
            .update(updates)
            .eq('id', params.id)
            .select()
            .single();
        if (updateError) throw updateError;
        return ok({ request: updated });
    } catch (error) {
        console.error('Franchise lead registration request PUT error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to update lead registration request');
    }
}

async function fetchFallbackRow(id: string): Promise<RequestRow | null> {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, created_by, data')
        .eq('id', id)
        .eq('data->>sourceType', 'franchise_lead_registration')
        .maybeSingle<RequestRow>();
    if (error) throw error;
    return data || null;
}
