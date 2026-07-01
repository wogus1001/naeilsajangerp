import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequesterProfile } from '@/lib/api-auth';
import {
    normalizeVendorContractCategory,
    normalizeVendorContractDocumentSource
} from '@/lib/franchise-vendor-contracts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VendorContractPayload = {
    readonly id?: unknown;
    readonly companyId?: unknown;
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

export function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

export function isMissingVendorContractSchemaError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code) && /franchise_vendor_contracts/i.test(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
    return UUID_REGEX.test(value);
}

function normalizeDate(value: unknown): string | null {
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

export function buildMutationPayload(
    body: VendorContractPayload,
    companyId: string,
    requester: RequesterProfile,
    mode: 'create' | 'update'
) {
    const id = cleanString(body.id);
    const electronicContractId = cleanString(body.electronicContractId);
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
        storage_bucket: cleanString(body.storageBucket) || null,
        storage_path: cleanString(body.storagePath) || null,
        updated_by: requester.id,
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
