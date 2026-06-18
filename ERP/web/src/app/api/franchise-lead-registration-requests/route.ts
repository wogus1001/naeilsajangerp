import {
    canAccessCompanyScope,
    getRequesterProfile,
    resolveCompanyIdByName,
    resolveUserUuid
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { canAccessFranchiseLead } from '@/lib/franchise-lead-access';
import { isMissingLeadRegistrationRequestTableError } from '@/lib/franchise-lead-registration-table';
import { DEFAULT_FRANCHISE_LEAD_STATUS, normalizeLeadPhone } from '@/lib/franchise-leads';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type RequestRow = {
    readonly id: string;
    readonly company_id: string;
    readonly manager_id: string | null;
    readonly created_by: string | null;
    readonly name: string;
    readonly mobile: string | null;
    readonly mobile_normalized: string | null;
    readonly source: string | null;
    readonly status: string;
    readonly grade: string | null;
    readonly desired_region: string | null;
    readonly budget_min: number | null;
    readonly budget_max: number | null;
    readonly interested_brand: string | null;
    readonly memo: string | null;
    readonly next_contact_at: string | null;
    readonly promoted_lead_id: string | null;
    readonly promoted_at: string | null;
    readonly created_at: string;
    readonly updated_at: string;
    readonly data: Record<string, unknown> | null;
};

type ManagerRow = {
    readonly company_id: string | null;
};

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;
type RequesterProfile = NonNullable<Awaited<ReturnType<typeof getRequesterProfile>>>;

type LegacyLeadRow = RequestRow & {
    readonly created_by: string | null;
    readonly promoted_lead_id?: null;
    readonly promoted_at?: null;
};

const CONTROL_FIELDS = new Set([
    'requesterId',
    'userId',
    'companyName',
    'companyId',
    'managerId',
    'name',
    'mobile',
    'source',
    'status',
    'grade',
    'desiredRegion',
    'budgetMin',
    'budgetMax',
    'interestedBrand',
    'memo',
    'nextContactAt'
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
    const body: unknown = await request.json();
    return isRecord(body) ? body : {};
}

function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized || null;
}

function parseNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableDate(value: unknown): string | null {
    const raw = cleanString(value);
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}

function collectData(body: Record<string, unknown>): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
        if (!CONTROL_FIELDS.has(key)) data[key] = value;
    }
    return data;
}

function transformRequest(row: RequestRow) {
    return {
        ...(row.data || {}),
        id: row.id,
        companyId: row.company_id,
        managerId: row.manager_id || '',
        name: row.name,
        mobile: row.mobile || '',
        mobileNormalized: row.mobile_normalized || normalizeLeadPhone(row.mobile),
        source: row.source || '',
        status: row.status,
        grade: row.grade || '',
        desiredRegion: row.desired_region || '',
        budgetMin: row.budget_min,
        budgetMax: row.budget_max,
        interestedBrand: row.interested_brand || '',
        memo: row.memo || '',
        nextContactAt: row.next_contact_at,
        promotedLeadId: row.promoted_lead_id || '',
        promotedAt: row.promoted_at || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function transformLegacyRequest(row: LegacyLeadRow) {
    return transformRequest({
        ...row,
        promoted_lead_id: null,
        promoted_at: null
    });
}

async function saveLegacyPendingRequest(
    supabaseAdmin: SupabaseAdminClient,
    payload: Record<string, unknown>,
    mobileNormalized: string,
    nowIso: string,
    requester: RequesterProfile
) {
    const legacyPayload = {
        ...payload,
        created_by: requester.id,
        data: {
            ...isRecord(payload['data']) ? payload['data'] : {},
            sourceType: 'franchise_lead_registration',
            leadStage: 'raw_intake',
            adminIntakeStatus: 'pending',
            requestTableFallback: true
        }
    };

    if (mobileNormalized) {
        const { data: existing, error: existingError } = await supabaseAdmin
            .from('franchise_leads')
            .select('*')
            .eq('company_id', String(payload['company_id']))
            .eq('mobile_normalized', mobileNormalized)
            .maybeSingle<LegacyLeadRow>();
        if (existingError) throw existingError;
        if (existing) {
            if (!canAccessFranchiseLead(requester, existing)) {
                return fail(403, 'FORBIDDEN', 'Forbidden: cross-company update denied');
            }
            if (existing.data?.['sourceType'] !== 'franchise_lead_registration' || existing.data?.['adminIntakeStatus'] === 'promoted') {
                return fail(409, 'VALIDATION_ERROR', '같은 연락처의 가맹 희망자가 이미 모객 DB에 있습니다.');
            }
            const { data: updated, error: updateError } = await supabaseAdmin
                .from('franchise_leads')
                .update(legacyPayload)
                .eq('id', existing.id)
                .select()
                .single<LegacyLeadRow>();
            if (updateError) throw updateError;
            return ok({ request: transformLegacyRequest(updated), deduplicated: true, fallback: true });
        }
    }

    const { data: inserted, error } = await supabaseAdmin
        .from('franchise_leads')
        .insert({ ...legacyPayload, created_at: nowIso })
        .select()
        .single<LegacyLeadRow>();
    if (error) throw error;
    return ok({ request: transformLegacyRequest(inserted), deduplicated: false, fallback: true }, 201);
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await parseBody(request);
        const requester = await getRequesterProfile(supabaseAdmin, request, cleanString(body['requesterId']));
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const companyId = await resolveCompanyIdByName(supabaseAdmin, cleanString(body['companyName'])) || requester.company_id;
        const managerId = await resolveUserUuid(supabaseAdmin, cleanString(body['managerId']) || requester.id);
        if (!companyId || !managerId) return fail(400, 'VALIDATION_ERROR', 'Valid managerId and company scope are required');
        if (!canAccessCompanyScope(requester, companyId)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company create denied');

        const { data: managerProfile } = await supabaseAdmin
            .from('profiles')
            .select('company_id')
            .eq('id', managerId)
            .maybeSingle<ManagerRow>();
        if (!managerProfile || managerProfile.company_id !== companyId) {
            return fail(403, 'FORBIDDEN', 'Forbidden: manager/company mismatch');
        }

        const name = cleanString(body['name']);
        if (!name) return fail(400, 'VALIDATION_ERROR', 'Name is required');

        const mobile = cleanString(body['mobile']);
        const mobileNormalized = normalizeLeadPhone(mobile);
        const nowIso = new Date().toISOString();
        const payload = {
            company_id: companyId,
            manager_id: managerId,
            created_by: requester.id,
            name,
            mobile,
            mobile_normalized: mobileNormalized || null,
            source: cleanString(body['source']),
            status: cleanString(body['status']) || DEFAULT_FRANCHISE_LEAD_STATUS,
            grade: cleanString(body['grade']),
            desired_region: cleanString(body['desiredRegion']),
            budget_min: parseNullableNumber(body['budgetMin']),
            budget_max: parseNullableNumber(body['budgetMax']),
            interested_brand: cleanString(body['interestedBrand']),
            memo: cleanString(body['memo']),
            next_contact_at: parseNullableDate(body['nextContactAt']),
            updated_at: nowIso,
            data: collectData(body)
        };

        if (mobileNormalized) {
            const { data: existing, error: existingError } = await supabaseAdmin
                .from('franchise_lead_registration_requests')
                .select('*')
                .eq('company_id', companyId)
                .eq('mobile_normalized', mobileNormalized)
                .is('promoted_at', null)
                .maybeSingle<RequestRow>();
            if (existingError) {
                if (isMissingLeadRegistrationRequestTableError(existingError)) {
                    return saveLegacyPendingRequest(supabaseAdmin, payload, mobileNormalized, nowIso, requester);
                }
                throw existingError;
            }
            if (existing) {
                if (!canAccessFranchiseLead(requester, existing)) {
                    return fail(403, 'FORBIDDEN', 'Forbidden: cross-company update denied');
                }
                const { data: updated, error: updateError } = await supabaseAdmin
                    .from('franchise_lead_registration_requests')
                    .update(payload)
                    .eq('id', existing.id)
                    .select()
                    .single<RequestRow>();
                if (updateError) throw updateError;
                return ok({ request: transformRequest(updated), deduplicated: true });
            }
        }

        const { data: inserted, error } = await supabaseAdmin
            .from('franchise_lead_registration_requests')
            .insert({ ...payload, created_at: nowIso })
            .select()
            .single<RequestRow>();
        if (error) {
            if (isMissingLeadRegistrationRequestTableError(error)) {
                return saveLegacyPendingRequest(supabaseAdmin, payload, mobileNormalized, nowIso, requester);
            }
            throw error;
        }

        return ok({ request: transformRequest(inserted), deduplicated: false }, 201);
    } catch (error) {
        console.error('Franchise lead registration request POST error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to save lead registration request');
    }
}
