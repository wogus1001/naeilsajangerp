import { canAccessCompanyScope, getAuthenticatedRequesterProfile, isAdmin, type RequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { toFranchiseVendorView, type FranchiseVendorCategory, type FranchiseVendorRow, type FranchiseVendorStatus } from '@/lib/franchise-vendors';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type VendorBody = {
    readonly businessNumber: string;
    readonly category: FranchiseVendorCategory;
    readonly companyId: string;
    readonly contactEmail: string;
    readonly contactName: string;
    readonly contactPhone: string;
    readonly id: string;
    readonly memo: string;
    readonly status: FranchiseVendorStatus;
    readonly vendorName: string;
};

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function categoryValue(value: unknown): FranchiseVendorCategory {
    const candidate = cleanString(value);
    switch (candidate) {
        case 'logistics':
        case 'food_material':
        case 'interior':
        case 'marketing':
        case 'lease':
            return candidate;
        default:
            return 'other';
    }
}

function statusValue(value: unknown): FranchiseVendorStatus {
    return cleanString(value) === 'inactive' ? 'inactive' : 'active';
}

async function readBody(request: Request): Promise<VendorBody> {
    const body: unknown = await request.json();
    const record = isRecord(body) ? body : {};
    return {
        businessNumber: cleanString(record.businessNumber),
        category: categoryValue(record.category),
        companyId: cleanString(record.companyId),
        contactEmail: cleanString(record.contactEmail),
        contactName: cleanString(record.contactName),
        contactPhone: cleanString(record.contactPhone),
        id: cleanString(record.id),
        memo: cleanString(record.memo),
        status: statusValue(record.status),
        vendorName: cleanString(record.vendorName)
    };
}

function isMissingVendorSchemaError(error: unknown): boolean {
    if (!isRecord(error)) return false;
    const code = cleanString(error.code);
    const message = cleanString(error.message);
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code) && /franchise_vendors/i.test(message);
}

async function resolveRequester(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) return { ok: false as const, response: fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.') };
    return { ok: true as const, requester, supabaseAdmin };
}

function resolveCompanyId(requester: RequesterProfile, requestedCompanyId: string) {
    const companyId = isAdmin(requester) && requestedCompanyId ? requestedCompanyId : requester.company_id;
    if (!companyId) return { ok: false as const, response: fail(400, 'VALIDATION_ERROR', '회사 정보가 필요합니다.') };
    if (!canAccessCompanyScope(requester, companyId)) {
        return { ok: false as const, response: fail(403, 'FORBIDDEN', '업체 관리 접근 권한이 없습니다.') };
    }
    return { companyId, ok: true as const };
}

function mutationPayload(body: VendorBody, companyId: string, requesterId: string) {
    return {
        business_number: body.businessNumber || null,
        category: body.category,
        company_id: companyId,
        contact_email: body.contactEmail || null,
        contact_name: body.contactName || null,
        contact_phone: body.contactPhone || null,
        memo: body.memo || null,
        status: body.status,
        updated_by: requesterId,
        vendor_name: body.vendorName
    };
}

export async function GET(request: Request) {
    try {
        const auth = await resolveRequester(request);
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        const scope = resolveCompanyId(auth.requester, cleanString(searchParams.get('companyId')));
        if (!scope.ok) return scope.response;

        const status = cleanString(searchParams.get('status'));
        let query = auth.supabaseAdmin
            .from('franchise_vendors')
            .select('*')
            .eq('company_id', scope.companyId);
        if (status && status !== 'all') query = query.eq('status', status);

        const { data, error } = await query
            .order('updated_at', { ascending: false })
            .limit(500)
            .returns<FranchiseVendorRow[]>();
        if (error) throw error;

        return ok({ schemaReady: true, vendors: (data || []).map(row => toFranchiseVendorView(row)) });
    } catch (error) {
        if (isMissingVendorSchemaError(error)) return ok({ schemaReady: false, vendors: [] });
        console.error('Franchise vendors GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '업체 목록을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const body = await readBody(request);
        const auth = await resolveRequester(request);
        if (!auth.ok) return auth.response;

        const scope = resolveCompanyId(auth.requester, body.companyId);
        if (!scope.ok) return scope.response;
        if (!body.vendorName) return fail(400, 'VALIDATION_ERROR', '업체명이 필요합니다.');

        const { data, error } = await auth.supabaseAdmin
            .from('franchise_vendors')
            .insert({
                ...mutationPayload(body, scope.companyId, auth.requester.id),
                created_by: auth.requester.id
            })
            .select('*')
            .single<FranchiseVendorRow>();
        if (error) throw error;

        return ok({ vendor: toFranchiseVendorView(data) }, 201);
    } catch (error) {
        if (isMissingVendorSchemaError(error)) {
            return fail(424, 'INTERNAL_ERROR', '업체 관리 SQL이 아직 적용되지 않았습니다. supabase_franchise_vendors_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise vendors POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '업체를 등록하지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await readBody(request);
        const auth = await resolveRequester(request);
        if (!auth.ok) return auth.response;
        if (!body.id) return fail(400, 'VALIDATION_ERROR', '업체 ID가 필요합니다.');
        if (!body.vendorName) return fail(400, 'VALIDATION_ERROR', '업체명이 필요합니다.');

        const { data: existing, error: findError } = await auth.supabaseAdmin
            .from('franchise_vendors')
            .select('id, company_id')
            .eq('id', body.id)
            .maybeSingle<{ readonly id: string; readonly company_id: string }>();
        if (findError) throw findError;
        if (!existing?.company_id) return fail(404, 'NOT_FOUND', '업체를 찾을 수 없습니다.');
        if (!canAccessCompanyScope(auth.requester, existing.company_id)) {
            return fail(403, 'FORBIDDEN', '업체를 수정할 권한이 없습니다.');
        }

        const { data, error } = await auth.supabaseAdmin
            .from('franchise_vendors')
            .update(mutationPayload(body, existing.company_id, auth.requester.id))
            .eq('id', body.id)
            .select('*')
            .single<FranchiseVendorRow>();
        if (error) throw error;

        return ok({ vendor: toFranchiseVendorView(data) });
    } catch (error) {
        if (isMissingVendorSchemaError(error)) {
            return fail(424, 'INTERNAL_ERROR', '업체 관리 SQL이 아직 적용되지 않았습니다. supabase_franchise_vendors_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise vendors PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '업체를 수정하지 못했습니다.');
    }
}
