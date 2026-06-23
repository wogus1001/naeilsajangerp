import { getAuthenticatedRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    canCancelElectronicContract,
    canViewElectronicContract,
    isElectronicContractCancelableStatus
} from '@/lib/electronic-contracts/document-permissions';
import {
    toElectronicContractView,
    type ElectronicContractRow
} from '@/lib/electronic-contracts/records';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    cancelPlatformDocumentRequest
} from '@/lib/ucansign/platform-document-actions';
import { UcansignPlatformError } from '@/lib/ucansign/platform-client';

export const dynamic = 'force-dynamic';

type RouteContext = {
    readonly params: Promise<{ readonly id: string }>;
};

const DEFAULT_CANCELLATION_MESSAGE = '내일사장 ERP에서 서명 요청이 취소되었습니다.';

async function recordCancellationEvent(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    contract: ElectronicContractRow,
    providerResponse: unknown
): Promise<void> {
    const { error } = await supabaseAdmin.from('contract_events').insert({
        electronic_contract_id: contract.id,
        ucansign_document_id: contract.ucansign_document_id,
        event_type: 'ucansign_request_cancellation_requested',
        payload: typeof providerResponse === 'object' && providerResponse !== null
            ? providerResponse
            : { value: providerResponse },
        created_at: new Date().toISOString()
    });
    if (error) {
        console.error('Electronic contract cancellation event error:', error);
    }
}

export async function POST(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const { data, error } = await supabaseAdmin
            .from('electronic_contracts')
            .select('*')
            .eq('id', id)
            .maybeSingle<ElectronicContractRow>();
        if (error) throw error;
        if (!data) return fail(404, 'NOT_FOUND', 'Electronic contract not found');
        if (!canViewElectronicContract(
            { id: requester.id, role: requester.role, companyId: requester.company_id },
            { sentByProfileId: data.sent_by_profile_id, companyId: data.company_id }
        )) return fail(403, 'FORBIDDEN', 'Contract access denied');
        if (!canCancelElectronicContract(
            { id: requester.id, role: requester.role },
            { sentByProfileId: data.sent_by_profile_id }
        )) return fail(403, 'FORBIDDEN', 'Only the sender or admin can cancel this contract');
        if (!data.ucansign_document_id) {
            return fail(400, 'VALIDATION_ERROR', '취소할 수 있는 UCanSign 문서가 없습니다.');
        }
        if (!isElectronicContractCancelableStatus(data.status)) {
            return fail(400, 'VALIDATION_ERROR', '발송 중이거나 서명 대기 중인 문서만 취소할 수 있습니다.');
        }

        const providerResponse = await cancelPlatformDocumentRequest(
            data.ucansign_document_id,
            DEFAULT_CANCELLATION_MESSAGE
        );
        const now = new Date().toISOString();
        const { data: updatedContract, error: updateError } = await supabaseAdmin
            .from('electronic_contracts')
            .update({ status: 'canceled', updated_at: now })
            .eq('id', id)
            .select('*')
            .single<ElectronicContractRow>();
        if (updateError) throw updateError;

        await recordCancellationEvent(supabaseAdmin, updatedContract, providerResponse);

        return ok({ contract: toElectronicContractView(updatedContract) });
    } catch (error) {
        console.error('Electronic contract cancellation error:', error);
        const message = error instanceof UcansignPlatformError
            ? error.message
            : '전자계약 서명 요청을 취소하지 못했습니다.';
        return fail(500, 'INTERNAL_ERROR', message);
    }
}
