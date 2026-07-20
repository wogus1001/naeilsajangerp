import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequesterProfile } from '@/lib/api-auth';
import {
    normalizeVendorContractCategory,
    normalizeVendorContractDocumentSource
} from '@/lib/franchise-vendor-contracts';
import { parseUploadStorageTarget } from '@/lib/upload-storage-policy';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const VENDOR_CONTRACT_STORAGE_BUCKET = 'property-documents';

export type VendorContractPayload = {
    readonly id?: unknown;
    readonly companyId?: unknown;
    readonly vendorId?: unknown;
    readonly category?: unknown;
    readonly vendorName?: unknown;
    readonly contractTitle?: unknown;
    readonly contractStartDate?: unknown;
    readonly contractEndDate?: unknown;
    readonly status?: unknown;
    readonly ownerProfileId?: unknown;
    readonly documentSource?: unknown;
    readonly electronicContractId?: unknown;
    readonly storageBucket?: unknown;
    readonly storagePath?: unknown;
    readonly fileName?: unknown;
    readonly memo?: unknown;
};

type ElectronicContractScopeRow = {
    readonly id: string;
    readonly company_id: string | null;
};

type VendorScopeRow = {
    readonly id: string;
    readonly company_id: string | null;
};

type VendorContractOwnerScopeRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly status: string | null;
};

export type VendorContractStorageValidationResult =
    | { readonly ok: true }
    | { readonly ok: false; readonly status: 400 | 403; readonly message: string };

export function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

export function isMissingVendorContractSchemaError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code) && /franchise_vendor_contracts/i.test(message);
}

export function isMissingVendorContractEventSchemaError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code) && /franchise_vendor_contract_events/i.test(message);
}

export function isMissingVendorSchemaError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code) && /franchise_vendors/i.test(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
    return UUID_REGEX.test(value);
}

export function normalizeDate(value: unknown): string | null {
    const text = cleanString(value);
    if (!text) return null;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return text.slice(0, 10);
}

function readPayload(value: unknown): VendorContractPayload {
    return isRecord(value) ? value : {};
}

export async function readJsonBody(request: Request): Promise<VendorContractPayload> {
    try {
        const payload = await request.json();
        return readPayload(payload);
    } catch {
        return {};
    }
}

export async function isElectronicContractInCompany(
    supabaseAdmin: SupabaseClient,
    electronicContractId: string,
    companyId: string
): Promise<boolean> {
    if (!electronicContractId) return true;
    const { data, error } = await supabaseAdmin
        .from('electronic_contracts')
        .select('id, company_id')
        .eq('id', electronicContractId)
        .maybeSingle<ElectronicContractScopeRow>();
    if (error) throw error;
    return Boolean(data && data.company_id === companyId);
}

export async function isVendorInCompany(
    supabaseAdmin: SupabaseClient,
    vendorId: string,
    companyId: string
): Promise<boolean> {
    if (!vendorId) return true;
    const { data, error } = await supabaseAdmin
        .from('franchise_vendors')
        .select('id, company_id')
        .eq('id', vendorId)
        .maybeSingle<VendorScopeRow>();
    if (error) throw error;
    return Boolean(data && data.company_id === companyId);
}

export async function isActiveVendorContractOwner(
    supabaseAdmin: SupabaseClient,
    profileId: string,
    companyId: string
): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, company_id, status')
        .eq('id', profileId)
        .maybeSingle<VendorContractOwnerScopeRow>();
    if (error) throw error;
    return Boolean(data && data.company_id === companyId && data.status === 'active');
}

export function validateVendorContractStorage(
    body: VendorContractPayload,
    companyId: string
): VendorContractStorageValidationResult {
    const storagePath = cleanString(body.storagePath);
    const storageBucket = cleanString(body.storageBucket) || VENDOR_CONTRACT_STORAGE_BUCKET;
    if (!storagePath && !cleanString(body.storageBucket)) return { ok: true };
    if (!storagePath) {
        return { ok: false, status: 400, message: '업로드 문서 경로가 필요합니다.' };
    }
    if (storageBucket !== VENDOR_CONTRACT_STORAGE_BUCKET) {
        return { ok: false, status: 400, message: '업로드 문서 버킷이 올바르지 않습니다.' };
    }

    const parsed = parseUploadStorageTarget({
        bucket: storageBucket,
        companyId,
        path: storagePath
    });
    if (!parsed.ok || parsed.target.kind !== 'vendorContract') {
        return { ok: false, status: 403, message: '업로드 문서 경로의 회사 범위가 일치하지 않습니다.' };
    }
    return { ok: true };
}

export function buildMutationPayload(
    body: VendorContractPayload,
    companyId: string,
    requester: RequesterProfile,
    mode: 'create' | 'update'
) {
    const id = cleanString(body.id);
    const electronicContractId = cleanString(body.electronicContractId);
    const vendorId = cleanString(body.vendorId);
    const storagePath = cleanString(body.storagePath);
    const payload = {
        category: normalizeVendorContractCategory(body.category),
        contract_end_date: normalizeDate(body.contractEndDate),
        contract_start_date: normalizeDate(body.contractStartDate),
        contract_title: cleanString(body.contractTitle),
        document_source: normalizeVendorContractDocumentSource(body.documentSource),
        electronic_contract_id: electronicContractId || null,
        file_name: cleanString(body.fileName) || null,
        memo: cleanString(body.memo) || null,
        owner_profile_id: cleanString(body.ownerProfileId) || requester.id,
        status: cleanString(body.status) || 'active',
        storage_bucket: storagePath ? VENDOR_CONTRACT_STORAGE_BUCKET : null,
        storage_path: storagePath || null,
        updated_by: requester.id,
        vendor_id: vendorId || null,
        vendor_name: cleanString(body.vendorName)
    };

    return mode === 'create'
        ? {
            ...payload,
            company_id: companyId,
            created_by: requester.id,
            id: id && isUuid(id) ? id : crypto.randomUUID()
        }
        : payload;
}

export function validateRequired(body: VendorContractPayload): string | null {
    if (!cleanString(body.vendorName)) return '업체명을 입력해주세요.';
    if (!cleanString(body.contractTitle)) return '계약명을 입력해주세요.';
    return null;
}
