import { canAccessCompanyScope, getAuthenticatedRequesterProfile, type RequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    toVendorContractEventView,
    type VendorContractEventRow
} from '@/lib/franchise-vendor-contract-events';
import {
    type VendorContractRow
} from '@/lib/franchise-vendor-contracts';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    cleanString,
    isMissingVendorContractEventSchemaError,
    isMissingVendorContractSchemaError
} from '../vendorContractRouteHelpers';
import {
    handleRenewContract,
    handleTerminateContract,
    type VendorContractActionBody
} from './vendorContractLifecycleActions';

export const dynamic = 'force-dynamic';

type ActionName = 'renew' | 'terminate';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readActionBody(request: Request): Promise<VendorContractActionBody> {
    try {
        const body: unknown = await request.json();
        return isRecord(body) ? body : {};
    } catch {
        return {};
    }
}

function normalizeAction(value: unknown): ActionName | null {
    const action = cleanString(value);
    if (action === 'renew' || action === 'terminate') return action;
    return null;
}

async function resolveRequester(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
    if (!requester) return { ok: false as const, response: fail(401, 'AUTH_REQUIRED', '로그인이 필요합니다.') };
    return { ok: true as const, requester, supabaseAdmin };
}

async function fetchScopedContract(contractId: string, requester: RequesterProfile): Promise<VendorContractRow | null> {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('franchise_vendor_contracts')
        .select('*')
        .eq('id', contractId)
        .maybeSingle<VendorContractRow>();
    if (error) throw error;
    if (!data?.company_id) return null;
    if (!canAccessCompanyScope(requester, data.company_id)) return null;
    return data;
}

async function ensureEventSchemaReady(): Promise<Response | null> {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('franchise_vendor_contract_events')
        .select('id')
        .limit(1);
    if (!error) return null;
    if (isMissingVendorContractEventSchemaError(error)) {
        return fail(424, 'INTERNAL_ERROR', '업체 계약 이력 SQL이 아직 적용되지 않았습니다. supabase_franchise_vendor_contract_events_migration.sql 적용 후 다시 확인해주세요.');
    }
    throw error;
}

export async function GET(request: Request) {
    try {
        const auth = await resolveRequester(request);
        if (!auth.ok) return auth.response;

        const eventSchemaError = await ensureEventSchemaReady();
        if (eventSchemaError) return eventSchemaError;

        const { searchParams } = new URL(request.url);
        const contractId = cleanString(searchParams.get('contractId') || searchParams.get('id'));
        if (!contractId) return fail(400, 'VALIDATION_ERROR', '계약 ID가 필요합니다.');

        const contract = await fetchScopedContract(contractId, auth.requester);
        if (!contract?.company_id) return fail(404, 'NOT_FOUND', '업체 계약을 찾을 수 없습니다.');

        const { data, error } = await auth.supabaseAdmin
            .from('franchise_vendor_contract_events')
            .select('*')
            .or(`contract_id.eq.${contractId},next_contract_id.eq.${contractId}`)
            .eq('company_id', contract.company_id)
            .order('created_at', { ascending: false })
            .limit(100)
            .returns<VendorContractEventRow[]>();
        if (error) throw error;

        return ok({ events: (data || []).map(toVendorContractEventView), schemaReady: true });
    } catch (error) {
        if (isMissingVendorContractSchemaError(error) || isMissingVendorContractEventSchemaError(error)) {
            return fail(424, 'INTERNAL_ERROR', '업체 계약함 SQL이 아직 적용되지 않았습니다.');
        }
        console.error('Franchise vendor contract actions GET error:', error);
        return fail(500, 'INTERNAL_ERROR', '업체 계약 이력을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        const body = await readActionBody(request);
        const action = normalizeAction(body.action);
        if (!action) return fail(400, 'VALIDATION_ERROR', '지원하지 않는 계약 액션입니다.');

        const auth = await resolveRequester(request);
        if (!auth.ok) return auth.response;

        const eventSchemaError = await ensureEventSchemaReady();
        if (eventSchemaError) return eventSchemaError;

        const contractId = cleanString(body.contractId);
        if (!contractId) return fail(400, 'VALIDATION_ERROR', '계약 ID가 필요합니다.');

        const contract = await fetchScopedContract(contractId, auth.requester);
        if (!contract?.company_id) return fail(404, 'NOT_FOUND', '업체 계약을 찾을 수 없습니다.');

        if (action === 'renew') return handleRenewContract(contract, body, auth.requester);
        return handleTerminateContract(contract, body, auth.requester);
    } catch (error) {
        if (isMissingVendorContractSchemaError(error) || isMissingVendorContractEventSchemaError(error)) {
            return fail(424, 'INTERNAL_ERROR', '업체 계약함 SQL이 아직 적용되지 않았습니다.');
        }
        console.error('Franchise vendor contract actions POST error:', error);
        return fail(500, 'INTERNAL_ERROR', '업체 계약 상태를 변경하지 못했습니다.');
    }
}
