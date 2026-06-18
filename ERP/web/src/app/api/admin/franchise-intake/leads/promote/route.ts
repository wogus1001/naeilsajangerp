import { getRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { buildLeadRegistrationPromotionData } from '@/lib/franchise-lead-registration';
import { normalizeLeadPhone } from '@/lib/franchise-leads';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type PromotionPayload = {
    readonly leadId: string;
    readonly targetCompanyId: string | null;
    readonly managerId: string | null;
    readonly requesterId: string | null;
};

type CompanyRow = {
    readonly id: string;
};

type ManagerRow = {
    readonly id: string;
    readonly company_id: string | null;
};

type LeadRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly manager_id: string | null;
    readonly name: string | null;
    readonly mobile: string | null;
    readonly mobile_normalized: string | null;
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
    readonly promoted_at: string | null;
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

function parsePayload(value: unknown): PromotionPayload | null {
    if (!isRecord(value)) return null;
    const leadId = readString(value, 'leadId');
    if (!leadId) return null;
    return {
        leadId,
        targetCompanyId: readString(value, 'targetCompanyId'),
        managerId: readString(value, 'managerId'),
        requesterId: readString(value, 'requesterId')
    };
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const payload = parsePayload(await request.json());
        if (!payload) return fail(400, 'VALIDATION_ERROR', 'Invalid lead promotion payload');

        const requester = await getRequesterProfile(supabaseAdmin, request, payload.requesterId);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');
        if (!isAdmin(requester)) return fail(403, 'FORBIDDEN', 'Admin access required');

        const { data: lead, error: leadError } = await supabaseAdmin
            .from('franchise_lead_registration_requests')
            .select('id, company_id, manager_id, name, mobile, mobile_normalized, source, status, grade, desired_region, interested_brand, budget_min, budget_max, memo, next_contact_at, promoted_lead_id, promoted_at, data')
            .eq('id', payload.leadId)
            .maybeSingle<LeadRow>();
        if (leadError) throw leadError;
        if (!lead) return fail(404, 'NOT_FOUND', 'Lead intake not found');
        if (lead.promoted_at || lead.promoted_lead_id) return fail(409, 'VALIDATION_ERROR', '이미 모객 DB로 반영된 접수 건입니다.');

        const targetCompanyId = payload.targetCompanyId || lead.company_id;
        if (!targetCompanyId) return fail(400, 'VALIDATION_ERROR', 'Target company is required');

        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('id', targetCompanyId)
            .maybeSingle<CompanyRow>();
        if (companyError) throw companyError;
        if (!company) return fail(404, 'NOT_FOUND', 'Target company not found');

        let selectedManagerId: string | null = null;
        if (payload.managerId) {
            const { data: manager, error: managerError } = await supabaseAdmin
                .from('profiles')
                .select('id, company_id')
                .eq('id', payload.managerId)
                .maybeSingle<ManagerRow>();
            if (managerError) throw managerError;
            if (!manager || manager.company_id !== targetCompanyId) {
                return fail(403, 'FORBIDDEN', 'Forbidden: manager/company mismatch');
            }
            selectedManagerId = manager.id;
        } else if (lead.company_id === targetCompanyId) {
            selectedManagerId = lead.manager_id;
        }

        const normalizedPhone = lead.mobile_normalized || normalizeLeadPhone(lead.mobile);
        if (normalizedPhone) {
            const { data: duplicate, error: duplicateError } = await supabaseAdmin
                .from('franchise_leads')
                .select('id')
                .eq('company_id', targetCompanyId)
                .eq('mobile_normalized', normalizedPhone)
                .neq('id', lead.id)
                .maybeSingle<{ readonly id: string }>();
            if (duplicateError) throw duplicateError;
            if (duplicate) {
                return fail(409, 'VALIDATION_ERROR', '같은 연락처의 가맹 희망자가 이미 대상 회사 모객 DB에 있습니다.');
            }
        }

        const nowIso = new Date().toISOString();
        const nextData = buildLeadRegistrationPromotionData(lead.data || {}, {
            promotedAt: nowIso,
            promotedBy: requester.id,
            requestId: lead.id
        });

        const { data: insertedLead, error: insertError } = await supabaseAdmin
            .from('franchise_leads')
            .insert({
                company_id: targetCompanyId,
                manager_id: selectedManagerId,
                name: lead.name || '이름 없음',
                mobile: lead.mobile,
                mobile_normalized: normalizedPhone || null,
                source: lead.source,
                status: lead.status || '문의접수',
                grade: lead.grade,
                desired_region: lead.desired_region,
                budget_min: lead.budget_min,
                budget_max: lead.budget_max,
                interested_brand: lead.interested_brand,
                memo: lead.memo,
                next_contact_at: lead.next_contact_at,
                data: nextData,
                created_at: nowIso,
                updated_at: nowIso
            })
            .select()
            .single();
        if (insertError) throw insertError;

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('franchise_lead_registration_requests')
            .update({
                promoted_lead_id: insertedLead.id,
                promoted_at: nowIso,
                data: {
                    ...(lead.data || {}),
                    adminIntakeStatus: 'promoted',
                    intakePromotedAt: nowIso,
                    promotedLeadId: insertedLead.id
                },
                updated_at: nowIso
            })
            .eq('id', lead.id)
            .select()
            .single();
        if (updateError) throw updateError;

        return ok({ request: updated, lead: insertedLead }, 201);
    } catch (error) {
        console.error('Admin lead registration promotion POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to promote lead registration');
    }
}
