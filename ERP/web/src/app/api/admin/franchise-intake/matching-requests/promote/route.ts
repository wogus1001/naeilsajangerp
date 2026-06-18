import { getRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildFranchiseMatchingRequestPromotionDraft,
    shouldUseSourceLeadForSameCompanyPromotion,
    type FranchiseMatchingRequestPromotionRow
} from '@/lib/franchise-matching-request-promotion';
import {
    buildMatchingRequestSourcePromotionData,
    findMatchingRequestPromotion
} from '@/lib/franchise-matching-request-promotion-links';
import { FRANCHISE_MATCHING_REQUEST_SOURCE, normalizeLeadPhone } from '@/lib/franchise-leads';
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

function getErrorCode(error: unknown): string {
    if (!isRecord(error)) return '';
    const code = error.code;
    return typeof code === 'string' ? code : '';
}

async function resolveManagerId(
    managerId: string | null,
    targetCompanyId: string,
    source: FranchiseMatchingRequestPromotionRow
): Promise<string | null | Response> {
    if (!managerId) return source.company_id === targetCompanyId ? source.manager_id : null;

    const supabaseAdmin = getSupabaseAdmin();
    const { data: manager, error } = await supabaseAdmin
        .from('profiles')
        .select('id, company_id')
        .eq('id', managerId)
        .maybeSingle<ManagerRow>();
    if (error) throw error;
    if (!manager || manager.company_id !== targetCompanyId) {
        return fail(403, 'FORBIDDEN', 'Forbidden: manager/company mismatch');
    }
    return manager.id;
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const payload = parsePayload(await request.json());
        if (!payload) return fail(400, 'VALIDATION_ERROR', 'Invalid matching request promotion payload');

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
            return fail(400, 'VALIDATION_ERROR', 'Only matching request leads can be promoted');
        }

        const targetCompanyId = payload.targetCompanyId || source.company_id;
        if (!targetCompanyId) return fail(400, 'VALIDATION_ERROR', 'Target company is required');
        const existingPromotion = findMatchingRequestPromotion(source.data || {}, targetCompanyId);
        if (existingPromotion) return fail(409, 'VALIDATION_ERROR', '이미 대상 회사 모객 DB로 반영된 매칭 요청입니다.');

        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('id', targetCompanyId)
            .maybeSingle<CompanyRow>();
        if (companyError) throw companyError;
        if (!company) return fail(404, 'NOT_FOUND', 'Target company not found');

        const selectedManagerId = await resolveManagerId(payload.managerId, targetCompanyId, source);
        if (selectedManagerId instanceof Response) return selectedManagerId;

        const nowIso = new Date().toISOString();
        if (shouldUseSourceLeadForSameCompanyPromotion(source, targetCompanyId)) {
            const { data: updatedSource, error: updateError } = await supabaseAdmin
                .from('franchise_leads')
                .update({
                    manager_id: selectedManagerId || source.manager_id,
                    data: buildMatchingRequestSourcePromotionData(source.data || {}, {
                        promotedAt: nowIso,
                        promotedBy: requester.id,
                        promotedLeadId: source.id,
                        targetCompanyId,
                        targetManagerId: selectedManagerId
                    }),
                    updated_at: nowIso
                })
                .eq('id', source.id)
                .select()
                .single();
            if (updateError) throw updateError;
            return ok({ request: updatedSource, lead: updatedSource });
        }

        const normalizedPhone = source.mobile_normalized || normalizeLeadPhone(source.mobile);
        if (normalizedPhone) {
            const { data: duplicate, error: duplicateError } = await supabaseAdmin
                .from('franchise_leads')
                .select('id')
                .eq('company_id', targetCompanyId)
                .eq('mobile_normalized', normalizedPhone)
                .neq('id', source.id)
                .maybeSingle<{ readonly id: string }>();
            if (duplicateError) throw duplicateError;
            if (duplicate) return fail(409, 'VALIDATION_ERROR', '같은 연락처의 가맹 희망자가 이미 대상 회사 모객 DB에 있습니다.');
        }

        const draft = buildFranchiseMatchingRequestPromotionDraft(source, targetCompanyId, selectedManagerId, nowIso);
        const { data: insertedLead, error: insertError } = await supabaseAdmin
            .from('franchise_leads')
            .insert({ ...draft, created_at: nowIso, updated_at: nowIso })
            .select()
            .single();
        if (insertError) {
            if (getErrorCode(insertError) === '23505') {
                return fail(409, 'VALIDATION_ERROR', '같은 연락처의 가맹 희망자가 이미 대상 회사 모객 DB에 있습니다.');
            }
            throw insertError;
        }

        const { data: updatedSource, error: updateError } = await supabaseAdmin
            .from('franchise_leads')
            .update({
                data: buildMatchingRequestSourcePromotionData(source.data || {}, {
                    promotedAt: nowIso,
                    promotedBy: requester.id,
                    promotedLeadId: insertedLead.id,
                    targetCompanyId,
                    targetManagerId: selectedManagerId
                }),
                updated_at: nowIso
            })
            .eq('id', source.id)
            .select()
            .single();
        if (updateError) throw updateError;

        return ok({ request: updatedSource, lead: insertedLead }, 201);
    } catch (error) {
        console.error('Admin matching request promotion POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to promote matching request');
    }
}
