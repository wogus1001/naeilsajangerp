import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    canAccessCompanyScope,
    getRequesterProfile,
    isAdmin,
    resolveCompanyIdByName,
    type RequesterProfile
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS,
    canEditFranchiseLeadSourceOption,
    canManageFranchiseLeadSourceOptions,
    mergeFranchiseLeadSourceOptions,
    validateFranchiseLeadSourceOptionLabel,
    type FranchiseLeadSourceOptionRow
} from '@/lib/franchise-lead-source-options';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type CompanyScope =
    | { readonly ok: true; readonly companyId: string }
    | { readonly ok: false; readonly response: Response };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getErrorCode(error: unknown): string {
    if (!isRecord(error)) return '';
    return typeof error.code === 'string' ? error.code : '';
}

function isMissingSourceOptionsSchema(error: unknown): boolean {
    return ['PGRST204', 'PGRST205', '42P01'].includes(getErrorCode(error));
}

async function resolveCompanyScope(
    supabaseAdmin: SupabaseClient,
    requester: RequesterProfile,
    companyName: string | null
): Promise<CompanyScope> {
    const requestedCompanyId = companyName
        ? await resolveCompanyIdByName(supabaseAdmin, companyName)
        : null;
    if (companyName && !requestedCompanyId) {
        return { ok: false, response: fail(404, 'NOT_FOUND', '회사를 찾지 못했습니다.') };
    }

    const companyId = isAdmin(requester)
        ? requestedCompanyId || requester.company_id
        : requester.company_id;
    if (!companyId) {
        return { ok: false, response: fail(400, 'VALIDATION_ERROR', '회사 범위를 확인할 수 없습니다.') };
    }
    if (!canAccessCompanyScope(requester, companyId)) {
        return { ok: false, response: fail(403, 'FORBIDDEN', '다른 회사의 유입경로를 관리할 수 없습니다.') };
    }
    return { ok: true, companyId };
}

async function readRequestBody(request: Request): Promise<Record<string, unknown> | null> {
    const body: unknown = await request.json().catch(() => null);
    return isRecord(body) ? body : null;
}

async function readSourceOption(
    supabaseAdmin: SupabaseClient,
    companyId: string,
    optionId: string
) {
    const { data, error } = await supabaseAdmin
        .from('franchise_lead_source_options')
        .select('id, company_id, code, label, is_system, is_active, sort_order')
        .eq('company_id', companyId)
        .eq('id', optionId)
        .maybeSingle<FranchiseLeadSourceOptionRow>();
    if (error) return { option: null, error };
    const option = data ? mergeFranchiseLeadSourceOptions([data]).find(item => item.id === data.id) || null : null;
    return { option, error: null };
}

export async function GET(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabaseAdmin, request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인 인증이 필요합니다.');

    const scope = await resolveCompanyScope(
        supabaseAdmin,
        requester,
        new URL(request.url).searchParams.get('company')
    );
    if (!scope.ok) return scope.response;

    const { data, error } = await supabaseAdmin
        .from('franchise_lead_source_options')
        .select('id, company_id, code, label, is_system, is_active, sort_order')
        .eq('company_id', scope.companyId)
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true })
        .returns<FranchiseLeadSourceOptionRow[]>();

    if (error) {
        if (isMissingSourceOptionsSchema(error)) {
            return ok({ options: DEFAULT_FRANCHISE_LEAD_SOURCE_OPTIONS, storageReady: false });
        }
        return fail(500, 'INTERNAL_ERROR', '유입경로 목록을 불러오지 못했습니다.');
    }
    const rows = data || [];
    return ok({ options: mergeFranchiseLeadSourceOptions(rows), storageReady: rows.length > 0 });
}

export async function POST(request: Request) {
    const body = await readRequestBody(request);
    if (!body) return fail(400, 'VALIDATION_ERROR', '요청 내용을 확인해주세요.');

    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabaseAdmin, request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인 인증이 필요합니다.');
    if (!canManageFranchiseLeadSourceOptions(requester.role)) {
        return fail(403, 'FORBIDDEN', '유입경로를 추가할 권한이 없습니다.');
    }

    const scope = await resolveCompanyScope(
        supabaseAdmin,
        requester,
        typeof body.company === 'string' ? body.company : null
    );
    if (!scope.ok) return scope.response;

    const labelResult = validateFranchiseLeadSourceOptionLabel(body.label);
    if (!labelResult.ok) return fail(400, 'VALIDATION_ERROR', labelResult.message);

    const { data: lastOption } = await supabaseAdmin
        .from('franchise_lead_source_options')
        .select('sort_order')
        .eq('company_id', scope.companyId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle<{ readonly sort_order: number }>();
    const { data, error } = await supabaseAdmin
        .from('franchise_lead_source_options')
        .insert({
            company_id: scope.companyId,
            code: `custom:${randomUUID()}`,
            label: labelResult.label,
            is_system: false,
            is_active: true,
            sort_order: (lastOption?.sort_order || 0) + 10,
            created_by: requester.id,
            updated_by: requester.id
        })
        .select('id, company_id, code, label, is_system, is_active, sort_order')
        .single<FranchiseLeadSourceOptionRow>();

    if (error) {
        if (isMissingSourceOptionsSchema(error)) {
            return fail(500, 'INTERNAL_ERROR', '유입경로 설정을 아직 사용할 수 없습니다.');
        }
        if (getErrorCode(error) === '23505') {
            return fail(409, 'CONFLICT', '같은 이름의 유입경로가 이미 있습니다.');
        }
        return fail(500, 'INTERNAL_ERROR', '유입경로를 추가하지 못했습니다.');
    }
    return ok({ option: mergeFranchiseLeadSourceOptions([data]).find(option => option.id === data.id) }, 201);
}

export async function PATCH(request: Request) {
    const body = await readRequestBody(request);
    if (!body) return fail(400, 'VALIDATION_ERROR', '요청 내용을 확인해주세요.');

    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequesterProfile(supabaseAdmin, request);
    if (!requester) return fail(401, 'AUTH_REQUIRED', '로그인 인증이 필요합니다.');
    if (!canManageFranchiseLeadSourceOptions(requester.role)) {
        return fail(403, 'FORBIDDEN', '유입경로를 수정할 권한이 없습니다.');
    }

    const scope = await resolveCompanyScope(
        supabaseAdmin,
        requester,
        typeof body.company === 'string' ? body.company : null
    );
    if (!scope.ok) return scope.response;

    const optionId = typeof body.id === 'string' ? body.id : '';
    if (!optionId) return fail(400, 'VALIDATION_ERROR', '수정할 유입경로를 선택해주세요.');
    const existingResult = await readSourceOption(supabaseAdmin, scope.companyId, optionId);
    if (existingResult.error) return fail(500, 'INTERNAL_ERROR', '유입경로를 확인하지 못했습니다.');
    if (!existingResult.option) return fail(404, 'NOT_FOUND', '유입경로를 찾지 못했습니다.');
    if (!canEditFranchiseLeadSourceOption(existingResult.option)) {
        return fail(403, 'FORBIDDEN', '고정 유입경로는 수정하거나 사용 중지할 수 없습니다.');
    }

    const updates: Record<string, unknown> = {
        updated_by: requester.id
    };
    if (body.label !== undefined) {
        const labelResult = validateFranchiseLeadSourceOptionLabel(body.label);
        if (!labelResult.ok) return fail(400, 'VALIDATION_ERROR', labelResult.message);
        updates.label = labelResult.label;
    }
    if (typeof body.isActive === 'boolean') updates.is_active = body.isActive;
    if (typeof body.sortOrder === 'number' && Number.isInteger(body.sortOrder)) {
        updates.sort_order = body.sortOrder;
    }
    if (Object.keys(updates).length === 1) {
        return fail(400, 'VALIDATION_ERROR', '수정할 내용을 입력해주세요.');
    }

    const { data, error } = await supabaseAdmin
        .from('franchise_lead_source_options')
        .update(updates)
        .eq('company_id', scope.companyId)
        .eq('id', optionId)
        .select('id, company_id, code, label, is_system, is_active, sort_order')
        .single<FranchiseLeadSourceOptionRow>();
    if (error) {
        if (getErrorCode(error) === '23505') {
            return fail(409, 'CONFLICT', '같은 이름의 유입경로가 이미 있습니다.');
        }
        return fail(500, 'INTERNAL_ERROR', '유입경로를 수정하지 못했습니다.');
    }
    return ok({ option: mergeFranchiseLeadSourceOptions([data]).find(option => option.id === data.id) });
}
