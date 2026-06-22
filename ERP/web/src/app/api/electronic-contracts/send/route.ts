import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildPremiumRightsUcansignPayload,
    type PremiumRightsContractInput
} from '@/lib/electronic-contracts/premium-rights-contract';
import {
    createPremiumRightsFormSnapshot,
    getString,
    isRecord,
    parsePremiumRightsDraftForm,
    PREMIUM_RIGHTS_TEMPLATE_KEY,
    PREMIUM_RIGHTS_TEMPLATE_VERSION,
    toPremiumRightsContractInput
} from '@/lib/electronic-contracts/premium-rights-draft';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getPremiumRightsTemplateId } from '@/lib/ucansign/platform-config';
import {
    extractUcansignDocumentId,
    uCanSignPlatformClient,
    UcansignPlatformError
} from '@/lib/ucansign/platform-client';

export const dynamic = 'force-dynamic';

type CompanyRow = {
    readonly id: string;
    readonly name: string | null;
};

type ProfileRow = {
    readonly name: string | null;
    readonly email: string | null;
};

type DraftRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly sent_by_profile_id: string | null;
    readonly status: string | null;
    readonly ucansign_document_id: string | null;
};

type ContractEventDocumentRow = {
    readonly ucansign_document_id: string | null;
};

function requireFields(input: PremiumRightsContractInput): string[] {
    const checks: readonly [string, string][] = [
        ['businessName', input.businessName],
        ['propertyAddress', input.propertyAddress],
        ['transferor.name', input.transferor.name],
        ['transferor.contact', input.transferor.contact],
        ['transferee.name', input.transferee.name],
        ['transferee.contact', input.transferee.contact],
        ['totalPremiumAmount', input.totalPremiumAmount]
    ];
    return checks.filter(([, value]) => !value).map(([key]) => key);
}

async function recordProviderDocument(
    supabaseAdmin: SupabaseClient,
    contractId: string,
    ucansignDocumentId: string,
    response: unknown
): Promise<void> {
    const { error } = await supabaseAdmin.from('contract_events').insert({
        electronic_contract_id: contractId,
        ucansign_document_id: ucansignDocumentId,
        event_type: 'ucansign_document_created',
        payload: isRecord(response) ? response : { value: response },
        created_at: new Date().toISOString()
    });
    if (error) throw error;
}

async function latestRecordedProviderDocument(
    supabaseAdmin: SupabaseClient,
    contractId: string
): Promise<string> {
    const { data, error } = await supabaseAdmin
        .from('contract_events')
        .select('ucansign_document_id')
        .eq('electronic_contract_id', contractId)
        .eq('event_type', 'ucansign_document_created')
        .not('ucansign_document_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<ContractEventDocumentRow>();

    if (error) throw error;
    return data?.ucansign_document_id || '';
}

async function markContractSent(
    supabaseAdmin: SupabaseClient,
    contractId: string,
    ucansignDocumentId: string
): Promise<void> {
    const { error } = await supabaseAdmin
        .from('electronic_contracts')
        .update({
            status: 'sent',
            ucansign_document_id: ucansignDocumentId,
            send_error: null,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', contractId);
    if (error) throw error;
}

export async function POST(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    let contractId = crypto.randomUUID();
    try {
        const body: unknown = await request.json();
        if (!isRecord(body)) return fail(400, 'VALIDATION_ERROR', 'Invalid contract payload');

        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const requestedCompanyId = getString(body, 'companyId');
        const companyId = isAdmin(requester) && requestedCompanyId ? requestedCompanyId : requester.company_id;
        if (!companyId) return fail(403, 'FORBIDDEN', 'Company scope is required');
        const draftContractId = getString(body, 'contractId') || getString(body, 'draftContractId');
        if (draftContractId) {
            contractId = draftContractId;
            const { data: draft, error } = await supabaseAdmin
                .from('electronic_contracts')
                .select('id, company_id, sent_by_profile_id, status, ucansign_document_id')
                .eq('id', draftContractId)
                .maybeSingle<DraftRow>();
            if (error) throw error;
            if (!draft) return fail(404, 'NOT_FOUND', 'Draft not found');
            if (draft.ucansign_document_id) {
                return ok({ contractId, ucansignDocumentId: draft.ucansign_document_id, status: draft.status || 'sent' });
            }
            const recordedDocumentId = await latestRecordedProviderDocument(supabaseAdmin, contractId);
            if (recordedDocumentId) {
                await markContractSent(supabaseAdmin, contractId, recordedDocumentId);
                return ok({ contractId, ucansignDocumentId: recordedDocumentId, status: 'sent' });
            }
            if (draft.status !== 'draft' && draft.status !== 'send_failed') {
                return fail(400, 'VALIDATION_ERROR', 'Only draft or failed contracts can be sent');
            }
            if (!isAdmin(requester) && draft.sent_by_profile_id !== requester.id) return fail(403, 'FORBIDDEN', 'Draft owner required');
            if (draft.company_id !== companyId) return fail(403, 'FORBIDDEN', 'Company scope mismatch');
        }

        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('id, name')
            .eq('id', companyId)
            .maybeSingle<CompanyRow>();
        const { data: sender } = await supabaseAdmin
            .from('profiles')
            .select('name, email')
            .eq('id', requester.id)
            .maybeSingle<ProfileRow>();

        const templateId = getPremiumRightsTemplateId();
        if (!templateId) return fail(500, 'INTERNAL_ERROR', '권리금계약서 유캔싸인 템플릿 ID가 설정되지 않았습니다.');

        const draftForm = parsePremiumRightsDraftForm(body, company?.name || getString(body, 'companyName') || '내일사장');
        const input: PremiumRightsContractInput = toPremiumRightsContractInput(draftForm, {
            companyId,
            sentByProfileId: requester.id,
            sentByName: sender?.name || sender?.email || requester.id,
            ucansignTemplateId: templateId
        });
        const missingFields = requireFields(input);
        if (missingFields.length > 0) {
            return fail(400, 'VALIDATION_ERROR', `Missing required fields: ${missingFields.join(', ')}`);
        }

        const payload = buildPremiumRightsUcansignPayload(input, contractId);
        const now = new Date().toISOString();
        const baseRow = {
            id: contractId,
            company_id: companyId,
            sent_by_profile_id: requester.id,
            template_key: PREMIUM_RIGHTS_TEMPLATE_KEY,
            template_version: PREMIUM_RIGHTS_TEMPLATE_VERSION,
            name: payload.documentName,
            status: 'sending',
            license_number: input.licenseNumber,
            form_snapshot: createPremiumRightsFormSnapshot(draftForm),
            payload_snapshot: payload,
            send_error: null,
            updated_at: now
        };

        const { error: saveError } = draftContractId
            ? await supabaseAdmin.from('electronic_contracts').update(baseRow).eq('id', contractId)
            : await supabaseAdmin.from('electronic_contracts').insert({ ...baseRow, created_at: now });
        if (saveError) throw saveError;

        const { templateId: _templateId, ...ucansignRequestBody } = payload;
        const response = await uCanSignPlatformClient(`/templates/${payload.templateId}`, {
            method: 'POST',
            body: JSON.stringify(ucansignRequestBody)
        });
        const ucansignDocumentId = extractUcansignDocumentId(response);
        if (!ucansignDocumentId) {
            throw new UcansignPlatformError(
                'API_ERROR',
                '전자계약 발송 응답에서 문서 ID를 확인하지 못했습니다. 서명자 연락처와 템플릿 서명자 설정을 확인해주세요.'
            );
        }
        await recordProviderDocument(supabaseAdmin, contractId, ucansignDocumentId, response);

        await markContractSent(supabaseAdmin, contractId, ucansignDocumentId);

        return ok({ contractId, ucansignDocumentId, status: 'sent' }, 201);
    } catch (error) {
        console.error('Electronic contract send error:', error);
        const recordedDocumentId = await latestRecordedProviderDocument(supabaseAdmin, contractId).catch(() => '');
        if (recordedDocumentId) {
            await markContractSent(supabaseAdmin, contractId, recordedDocumentId).catch(() => null);
        } else {
            await supabaseAdmin
                .from('electronic_contracts')
                .update({
                    status: 'send_failed',
                    send_error: error instanceof Error ? error.message : 'Unknown error',
                    updated_at: new Date().toISOString()
                })
                .eq('id', contractId);
        }
        const message = error instanceof UcansignPlatformError ? error.message : 'Failed to send electronic contract';
        return fail(500, 'INTERNAL_ERROR', message);
    }
}
