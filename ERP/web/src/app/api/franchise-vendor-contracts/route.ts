import { getAuthenticatedRequesterProfile, canAccessCompanyScope, isAdmin, type RequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { toVendorContractView, type VendorContractRow } from '@/lib/franchise-vendor-contracts';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    buildMutationPayload,
    cleanString,
    isElectronicContractInCompany,
    isActiveVendorContractOwner,
    isMissingVendorContractSchemaError,
    isMissingVendorSchemaError,
    isVendorInCompany,
    readJsonBody,
    validateRequired,
    validateVendorContractStorage,
    VENDOR_CONTRACT_STORAGE_BUCKET
} from './vendorContractRouteHelpers';
import { syncVendorContractSchedule } from './vendorContractScheduleSync';

export const dynamic = 'force-dynamic';

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
        return { ok: false as const, response: fail(403, 'FORBIDDEN', '회사 계약함 접근 권한이 없습니다.') };
    }

    return { companyId, ok: true as const };
}

async function fetchExistingContract(contractId: string, companyId?: string) {
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
        .from('franchise_vendor_contracts')
        .select('*')
        .eq('id', contractId);
    if (companyId) query = query.eq('company_id', companyId);
    return query.maybeSingle<VendorContractRow>();
}

async function openUploadedContract(contractId: string, companyId: string) {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await fetchExistingContract(contractId, companyId);
    if (error) throw error;
    if (!data) return fail(404, 'NOT_FOUND', '업체 계약을 찾을 수 없습니다.');
    if (!data.storage_bucket || !data.storage_path) {
        return fail(400, 'VALIDATION_ERROR', '열람할 업로드 문서가 없습니다.');
    }
    const storageValidation = validateVendorContractStorage({
        storageBucket: data.storage_bucket,
        storagePath: data.storage_path
    }, companyId);
    if (!storageValidation.ok) {
        return fail(storageValidation.status, 'FORBIDDEN', storageValidation.message);
    }
    const { data: signed, error: signedError } = await supabaseAdmin.storage
        .from(VENDOR_CONTRACT_STORAGE_BUCKET)
        .createSignedUrl(data.storage_path, 60 * 5);
    if (signedError) throw signedError;
    return ok({ url: signed.signedUrl });
}

export async function GET(request: Request) {
    try {
        const auth = await resolveRequester(request);
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        const scope = resolveCompanyId(auth.requester, cleanString(searchParams.get('companyId')));
        if (!scope.ok) return scope.response;

        const action = cleanString(searchParams.get('action'));
        const contractId = cleanString(searchParams.get('id') || searchParams.get('contractId'));
        if (action === 'open') {
            if (!contractId) return fail(400, 'VALIDATION_ERROR', '계약 ID가 필요합니다.');
            return openUploadedContract(contractId, scope.companyId);
        }

        let query = auth.supabaseAdmin
            .from('franchise_vendor_contracts')
            .select('*')
            .eq('company_id', scope.companyId)
            .neq('status', 'archived');

        const category = cleanString(searchParams.get('category'));
        const status = cleanString(searchParams.get('status'));
        const keyword = cleanString(searchParams.get('q')).toLowerCase();
        if (category && category !== 'all') query = query.eq('category', category);
        if (status && status !== 'all') query = query.eq('status', status);

        const { data, error } = await query
            .order('contract_end_date', { ascending: true, nullsFirst: false })
            .order('updated_at', { ascending: false })
            .limit(300)
            .returns<VendorContractRow[]>();
        if (error) throw error;

        const contracts = (data || [])
            .map(row => toVendorContractView(row))
            .filter(contract => !keyword
                || contract.vendorName.toLowerCase().includes(keyword)
                || contract.contractTitle.toLowerCase().includes(keyword)
                || contract.memo.toLowerCase().includes(keyword));

        return ok({ contracts, schemaReady: true });
    } catch (error) {
        if (isMissingVendorContractSchemaError(error)) return ok({ contracts: [], schemaReady: false });
        console.error('Franchise vendor contracts GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '업체 계약함을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const body = await readJsonBody(request);
        const auth = await resolveRequester(request);
        if (!auth.ok) return auth.response;

        const scope = resolveCompanyId(auth.requester, cleanString(body.companyId));
        if (!scope.ok) return scope.response;

        const validationError = validateRequired(body);
        if (validationError) return fail(400, 'VALIDATION_ERROR', validationError);

        const electronicContractId = cleanString(body.electronicContractId);
        if (!await isElectronicContractInCompany(auth.supabaseAdmin, electronicContractId, scope.companyId)) {
            return fail(403, 'FORBIDDEN', '전자계약 문서의 회사 범위가 일치하지 않습니다.');
        }
        const vendorId = cleanString(body.vendorId);
        if (!await isVendorInCompany(auth.supabaseAdmin, vendorId, scope.companyId)) {
            return fail(403, 'FORBIDDEN', '업체 관리의 회사 범위가 일치하지 않습니다.');
        }
        const ownerProfileId = cleanString(body.ownerProfileId) || auth.requester.id;
        if (!await isActiveVendorContractOwner(auth.supabaseAdmin, ownerProfileId, scope.companyId)) {
            return fail(403, 'FORBIDDEN', '계약 담당자의 회사 범위 또는 계정 상태가 올바르지 않습니다.');
        }
        const storageValidation = validateVendorContractStorage(body, scope.companyId);
        if (!storageValidation.ok) {
            return fail(storageValidation.status, 'FORBIDDEN', storageValidation.message);
        }

        const { data, error } = await auth.supabaseAdmin
            .from('franchise_vendor_contracts')
            .insert(buildMutationPayload(body, scope.companyId, auth.requester, 'create'))
            .select('*')
            .single<VendorContractRow>();
        if (error) throw error;

        const scheduleSync = await syncVendorContractSchedule({
            requester: auth.requester,
            row: data,
            supabaseAdmin: auth.supabaseAdmin
        });

        return ok({ contract: toVendorContractView(data), scheduleSync: scheduleSync.status });
    } catch (error) {
        if (isMissingVendorContractSchemaError(error)) {
            return fail(424, 'INTERNAL_ERROR', '업체 계약함 SQL이 아직 적용되지 않았습니다. supabase_franchise_vendor_contracts_migration.sql 적용 후 다시 확인해주세요.');
        }
        if (isMissingVendorSchemaError(error)) {
            return fail(424, 'INTERNAL_ERROR', '업체 관리 SQL이 아직 적용되지 않았습니다. supabase_franchise_vendors_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise vendor contracts POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '업체 계약을 저장하지 못했습니다.');
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await readJsonBody(request);
        const auth = await resolveRequester(request);
        if (!auth.ok) return auth.response;

        const contractId = cleanString(body.id);
        if (!contractId) return fail(400, 'VALIDATION_ERROR', '계약 ID가 필요합니다.');
        const validationError = validateRequired(body);
        if (validationError) return fail(400, 'VALIDATION_ERROR', validationError);

        const { data: existing, error: findError } = await fetchExistingContract(contractId);
        if (findError) throw findError;
        if (!existing?.company_id) return fail(404, 'NOT_FOUND', '업체 계약을 찾을 수 없습니다.');
        if (!canAccessCompanyScope(auth.requester, existing.company_id)) {
            return fail(403, 'FORBIDDEN', '회사 계약함 수정 권한이 없습니다.');
        }

        const electronicContractId = cleanString(body.electronicContractId);
        if (!await isElectronicContractInCompany(auth.supabaseAdmin, electronicContractId, existing.company_id)) {
            return fail(403, 'FORBIDDEN', '전자계약 문서의 회사 범위가 일치하지 않습니다.');
        }
        const vendorId = cleanString(body.vendorId);
        if (!await isVendorInCompany(auth.supabaseAdmin, vendorId, existing.company_id)) {
            return fail(403, 'FORBIDDEN', '업체 관리의 회사 범위가 일치하지 않습니다.');
        }
        const ownerProfileId = cleanString(body.ownerProfileId) || auth.requester.id;
        if (!await isActiveVendorContractOwner(auth.supabaseAdmin, ownerProfileId, existing.company_id)) {
            return fail(403, 'FORBIDDEN', '계약 담당자의 회사 범위 또는 계정 상태가 올바르지 않습니다.');
        }
        const storageValidation = validateVendorContractStorage(body, existing.company_id);
        if (!storageValidation.ok) {
            return fail(storageValidation.status, 'FORBIDDEN', storageValidation.message);
        }

        const { data, error } = await auth.supabaseAdmin
            .from('franchise_vendor_contracts')
            .update(buildMutationPayload(body, existing.company_id, auth.requester, 'update'))
            .eq('id', contractId)
            .select('*')
            .single<VendorContractRow>();
        if (error) throw error;

        const scheduleSync = await syncVendorContractSchedule({
            previousContractEndDate: existing.contract_end_date,
            requester: auth.requester,
            row: data,
            supabaseAdmin: auth.supabaseAdmin
        });

        return ok({ contract: toVendorContractView(data), scheduleSync: scheduleSync.status });
    } catch (error) {
        if (isMissingVendorSchemaError(error)) {
            return fail(424, 'INTERNAL_ERROR', '업체 관리 SQL이 아직 적용되지 않았습니다. supabase_franchise_vendors_migration.sql 적용 후 다시 확인해주세요.');
        }
        console.error('Franchise vendor contracts PATCH error:', error);
        return fail(500, 'INTERNAL_ERROR', '업체 계약을 수정하지 못했습니다.');
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await resolveRequester(request);
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        const contractId = cleanString(searchParams.get('id') || searchParams.get('contractId'));
        if (!contractId) return fail(400, 'VALIDATION_ERROR', '계약 ID가 필요합니다.');

        const { data: existing, error: findError } = await fetchExistingContract(contractId);
        if (findError) throw findError;
        if (!existing?.company_id) return fail(404, 'NOT_FOUND', '업체 계약을 찾을 수 없습니다.');
        if (!canAccessCompanyScope(auth.requester, existing.company_id)) {
            return fail(403, 'FORBIDDEN', '회사 계약함 삭제 권한이 없습니다.');
        }

        const { error } = await auth.supabaseAdmin
            .from('franchise_vendor_contracts')
            .update({ status: 'archived', updated_by: auth.requester.id, updated_at: new Date().toISOString() })
            .eq('id', contractId);
        if (error) throw error;

        const scheduleSync = await syncVendorContractSchedule({
            requester: auth.requester,
            row: { ...existing, status: 'archived' },
            supabaseAdmin: auth.supabaseAdmin
        });

        return ok({ success: true, scheduleSync: scheduleSync.status });
    } catch (error) {
        console.error('Franchise vendor contracts DELETE error:', error);
        return fail(500, 'INTERNAL_ERROR', '업체 계약을 삭제하지 못했습니다.');
    }
}
