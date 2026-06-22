import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildCompanyTemplateUcansignPayload,
    extractUcansignTemplateFields,
    extractUcansignTemplateRoles,
    normalizeTemplateFields,
    normalizeTemplateRoles,
    renderTemplateFormFromFields,
    type CompanyTemplateParticipant
} from '@/lib/electronic-contracts/company-template';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
    extractUcansignDocumentId,
    getPlatformTemplateDetail,
    uCanSignPlatformClient,
    UcansignPlatformError
} from '@/lib/ucansign/platform-client';
import {
    fetchTemplateForRequester,
    fetchVersionDetails,
    isRecord,
    textValue
} from '../../electronic-contract-templates/templateApi';

export const dynamic = 'force-dynamic';

type CompanyRow = {
    readonly name: string | null;
};

type DraftRow = {
    readonly id: string;
    readonly company_id: string | null;
    readonly sent_by_profile_id: string | null;
    readonly status: string | null;
    readonly template_source: string | null;
};

function recordValues(value: unknown): Record<string, string> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
        Object.entries(value).map(([key, fieldValue]) => [key, typeof fieldValue === 'string' ? fieldValue.trim() : ''])
    );
}

function inputMode(value: unknown): 'erp' | 'template' {
    return value === 'template' ? 'template' : 'erp';
}

function participantsFromBody(value: unknown): readonly CompanyTemplateParticipant[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).map(row => ({
        roleKey: textValue(row, 'roleKey'),
        name: textValue(row, 'name'),
        contact: textValue(row, 'contact')
    })).filter(participant => participant.roleKey && participant.name && participant.contact);
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

export async function POST(request: Request) {
    const supabaseAdmin = getSupabaseAdmin();
    let contractId = crypto.randomUUID();
    try {
        const body: unknown = await request.json();
        if (!isRecord(body)) return fail(400, 'VALIDATION_ERROR', 'Invalid company template contract payload');

        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const templateId = textValue(body, 'templateId');
        const versionId = textValue(body, 'versionId');
        if (!templateId || !versionId) return fail(400, 'VALIDATION_ERROR', '템플릿 정보가 필요합니다.');

        const access = await fetchTemplateForRequester(supabaseAdmin, requester, templateId);
        if (!access.ok) return fail(access.status, access.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', access.message);
        if (access.template.status !== 'active') return fail(400, 'VALIDATION_ERROR', '사용중 템플릿만 발송할 수 있습니다.');
        if (!isAdmin(requester) && access.template.company_id !== requester.company_id) {
            return fail(403, 'FORBIDDEN', '회사 범위가 일치하지 않습니다.');
        }

        const draftContractId = textValue(body, 'contractId') || textValue(body, 'draftContractId');
        if (draftContractId) {
            const { data: draft, error: draftError } = await supabaseAdmin
                .from('electronic_contracts')
                .select('id, company_id, sent_by_profile_id, status, template_source')
                .eq('id', draftContractId)
                .maybeSingle<DraftRow>();
            if (draftError) throw draftError;
            if (!draft) return fail(404, 'NOT_FOUND', 'Draft not found');
            if (draft.status !== 'draft' && draft.status !== 'send_failed') {
                return fail(400, 'VALIDATION_ERROR', 'Only draft or failed contracts can be sent');
            }
            if (draft.template_source !== 'company_uploaded') return fail(400, 'VALIDATION_ERROR', '회사 템플릿 초안이 아닙니다.');
            if (!isAdmin(requester) && draft.sent_by_profile_id !== requester.id) return fail(403, 'FORBIDDEN', 'Draft owner required');
            if (draft.company_id !== access.template.company_id) return fail(403, 'FORBIDDEN', 'Company scope mismatch');
            contractId = draftContractId;
        }

        const details = await fetchVersionDetails(supabaseAdmin, versionId);
        if (!details.version || details.version.template_id !== templateId) return fail(404, 'NOT_FOUND', '템플릿 버전을 찾을 수 없습니다.');
        if (details.version.status !== 'active') return fail(400, 'VALIDATION_ERROR', '사용중 버전만 발송할 수 있습니다.');
        if (!details.version.ucansign_template_id) {
            return fail(400, 'VALIDATION_ERROR', '유캔싸인 템플릿 ID가 연결되지 않아 아직 발송할 수 없습니다.');
        }

        const roles = normalizeTemplateRoles(details.roles.map(role => ({
            roleKey: role.role_key,
            label: role.label,
            signingOrder: role.signing_order || 1,
            required: role.required ?? true
        })));
        const fields = normalizeTemplateFields(details.fields.map(field => ({
            fieldKey: field.field_key,
            label: field.label,
            type: field.field_type,
            page: field.page || 1,
            x: field.x || 0,
            y: field.y || 0,
            width: field.width || 24,
            height: field.height || 8,
            required: field.required ?? false,
            roleKey: field.role_key || '',
            defaultValue: field.default_value || ''
        })));
        let effectiveRoles = roles;
        let effectiveFields = fields;
        try {
            const providerDetail = await getPlatformTemplateDetail(details.version.ucansign_template_id);
            const providerRoles = extractUcansignTemplateRoles(providerDetail);
            const providerFields = extractUcansignTemplateFields(providerDetail);
            if (providerRoles.length > 0) effectiveRoles = providerRoles;
            if (providerFields.length > 0) effectiveFields = providerFields;
        } catch (error) {
            console.warn('Failed to fetch UCanSign template send configuration:', error);
        }

        const nextInputMode = inputMode(body.inputMode);
        const values = recordValues(body.values);
        const missingFields = nextInputMode === 'erp'
            ? renderTemplateFormFromFields(effectiveFields)
                .filter(field => field.required && !values[field.fieldKey] && !field.defaultValue)
                .map(field => field.label)
            : [];
        if (missingFields.length > 0) {
            return fail(400, 'VALIDATION_ERROR', `필수 입력값을 확인해주세요: ${missingFields.join(', ')}`);
        }

        const participants = participantsFromBody(body.participants);
        const missingRoles = effectiveRoles
            .filter(role => role.required && !participants.some(participant => participant.roleKey === role.roleKey))
            .map(role => role.label);
        if (missingRoles.length > 0) {
            return fail(400, 'VALIDATION_ERROR', `서명자 정보를 확인해주세요: ${missingRoles.join(', ')}`);
        }

        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('name')
            .eq('id', access.template.company_id)
            .maybeSingle<CompanyRow>();

        const documentName = `[${company?.name || '회사'}] ${access.template.name}`;
        const payload = buildCompanyTemplateUcansignPayload({
            contractId,
            templateId: details.version.ucansign_template_id,
            documentName,
            inputMode: nextInputMode,
            roles: effectiveRoles,
            fields: effectiveFields,
            values,
            participants
        });
        const now = new Date().toISOString();
        const contractRow = {
            id: contractId,
            company_id: access.template.company_id,
            sent_by_profile_id: requester.id,
            template_key: 'company_uploaded',
            template_version: String(details.version.version_number || 1),
            template_source: 'company_uploaded',
            company_template_id: templateId,
            company_template_version_id: versionId,
            name: documentName,
            status: 'sending',
            form_snapshot: {
                companyName: company?.name || '',
                templateName: access.template.name,
                inputMode: nextInputMode,
                values,
                participants
            },
            payload_snapshot: payload,
            updated_at: now
        };
        const { error: saveError } = draftContractId
            ? await supabaseAdmin.from('electronic_contracts').update(contractRow).eq('id', contractId)
            : await supabaseAdmin.from('electronic_contracts').insert({ ...contractRow, created_at: now });
        if (saveError) throw saveError;

        const ucansignRequestBody = {
            documentName: payload.documentName,
            processType: payload.processType,
            isSequential: payload.isSequential,
            isSendMessage: payload.isSendMessage,
            fields: payload.fields,
            participants: payload.participants,
            customValue: payload.customValue,
            customValue1: payload.customValue1,
            customValue2: payload.customValue2,
            customValue3: payload.customValue3
        };
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

        const { error: updateError } = await supabaseAdmin
            .from('electronic_contracts')
            .update({
                status: 'sent',
                ucansign_document_id: ucansignDocumentId,
                sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', contractId);
        if (updateError) throw updateError;

        return ok({ contractId, ucansignDocumentId, status: 'sent' }, 201);
    } catch (error) {
        console.error('Company template electronic contract send error:', error);
        await supabaseAdmin
            .from('electronic_contracts')
            .update({
                status: 'send_failed',
                send_error: error instanceof Error ? error.message : 'Unknown error',
                updated_at: new Date().toISOString()
            })
            .eq('id', contractId);
        const message = error instanceof UcansignPlatformError ? error.message : '회사 템플릿 전자계약 발송에 실패했습니다.';
        return fail(500, 'INTERNAL_ERROR', message);
    }
}
