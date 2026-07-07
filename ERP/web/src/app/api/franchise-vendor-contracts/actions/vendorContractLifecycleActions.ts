import { fail, ok } from '@/lib/api-response';
import type { RequesterProfile } from '@/lib/api-auth';
import {
    canRenewVendorContractStatus,
    canTerminateVendorContractStatus,
    deriveVendorContractStatus,
    toVendorContractView,
    type VendorContractRow,
    type VendorContractStatus
} from '@/lib/franchise-vendor-contracts';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { cleanString, normalizeDate } from '../vendorContractRouteHelpers';

export type VendorContractActionBody = {
    readonly action?: unknown;
    readonly contractId?: unknown;
    readonly reason?: unknown;
    readonly contractTitle?: unknown;
    readonly contractStartDate?: unknown;
    readonly contractEndDate?: unknown;
    readonly memo?: unknown;
};

type EventInsert = {
    readonly company_id: string;
    readonly contract_id: string;
    readonly next_contract_id?: string | null;
    readonly event_type: 'created' | 'renewed' | 'terminated';
    readonly reason?: string | null;
    readonly previous_status?: VendorContractStatus | null;
    readonly next_status?: VendorContractStatus | null;
    readonly data?: Record<string, string>;
    readonly created_by: string;
};

async function insertEvents(events: readonly EventInsert[]): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('franchise_vendor_contract_events')
        .insert(events);
    if (error) throw error;
}

function currentStatus(contract: VendorContractRow): VendorContractStatus {
    return deriveVendorContractStatus({
        contractEndDate: contract.contract_end_date,
        explicitStatus: contract.status
    });
}

function buildRenewedContractPayload(
    existing: VendorContractRow,
    body: VendorContractActionBody,
    requester: RequesterProfile
) {
    return {
        category: existing.category || 'other',
        company_id: existing.company_id,
        contract_end_date: normalizeDate(body.contractEndDate),
        contract_start_date: normalizeDate(body.contractStartDate),
        contract_title: cleanString(body.contractTitle) || `${existing.contract_title || '업체 계약'} 갱신`,
        created_by: requester.id,
        data: {
            previousContractId: existing.id
        },
        document_source: 'manual',
        electronic_contract_id: null,
        file_name: null,
        memo: cleanString(body.memo) || existing.memo || null,
        owner_profile_id: existing.owner_profile_id || requester.id,
        status: 'active',
        storage_bucket: null,
        storage_path: null,
        updated_by: requester.id,
        vendor_id: existing.vendor_id || null,
        vendor_name: existing.vendor_name || '업체'
    };
}

export async function handleRenewContract(
    contract: VendorContractRow,
    body: VendorContractActionBody,
    requester: RequesterProfile
) {
    const previousStatus = currentStatus(contract);
    if (!canRenewVendorContractStatus(previousStatus)) {
        return fail(409, 'CONFLICT', '이미 종료되었거나 보관된 계약은 갱신 처리할 수 없습니다.');
    }
    const newEndDate = normalizeDate(body.contractEndDate);
    if (!newEndDate) return fail(400, 'VALIDATION_ERROR', '새 계약 만료일을 입력해주세요.');

    const supabaseAdmin = getSupabaseAdmin();
    const { data: updatedOld, error: oldError } = await supabaseAdmin
        .from('franchise_vendor_contracts')
        .update({ status: 'renewed', updated_by: requester.id, updated_at: new Date().toISOString() })
        .eq('id', contract.id)
        .select('*')
        .single<VendorContractRow>();
    if (oldError) throw oldError;

    const { data: newContract, error: insertError } = await supabaseAdmin
        .from('franchise_vendor_contracts')
        .insert(buildRenewedContractPayload(contract, body, requester))
        .select('*')
        .single<VendorContractRow>();
    if (insertError) throw insertError;

    const reason = cleanString(body.reason) || null;
    await insertEvents([
        {
            company_id: contract.company_id || '',
            contract_id: contract.id,
            created_by: requester.id,
            data: { newContractId: newContract.id },
            event_type: 'renewed',
            next_contract_id: newContract.id,
            next_status: 'renewed',
            previous_status: previousStatus,
            reason
        },
        {
            company_id: contract.company_id || '',
            contract_id: newContract.id,
            created_by: requester.id,
            data: { previousContractId: contract.id },
            event_type: 'created',
            next_status: 'active',
            previous_status: null,
            reason: '갱신 계약 생성'
        }
    ]);

    return ok({
        contract: toVendorContractView(updatedOld),
        nextContract: toVendorContractView(newContract)
    });
}

export async function handleTerminateContract(
    contract: VendorContractRow,
    body: VendorContractActionBody,
    requester: RequesterProfile
) {
    const previousStatus = currentStatus(contract);
    if (!canTerminateVendorContractStatus(previousStatus)) {
        return fail(409, 'CONFLICT', '이미 갱신완료, 종료 또는 보관된 계약입니다.');
    }
    const reason = cleanString(body.reason);
    if (!reason) return fail(400, 'VALIDATION_ERROR', '종료/해지 사유를 입력해주세요.');

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('franchise_vendor_contracts')
        .update({ status: 'terminated', updated_by: requester.id, updated_at: new Date().toISOString() })
        .eq('id', contract.id)
        .select('*')
        .single<VendorContractRow>();
    if (error) throw error;

    await insertEvents([{
        company_id: contract.company_id || '',
        contract_id: contract.id,
        created_by: requester.id,
        event_type: 'terminated',
        next_status: 'terminated',
        previous_status: previousStatus,
        reason
    }]);

    return ok({ contract: toVendorContractView(data) });
}
