import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildCompanyTemplateUcansignPayload,
    extractUcansignTemplateFields,
    extractUcansignTemplateRoles,
    normalizeTemplateFields,
    normalizeTemplateRoles,
    renderTemplateFormFromFields
} from '@/lib/electronic-contracts/company-template';
import {
    invalidSignerContactLabels,
    missingRequiredSignerLabels,
    parseRequestSignerParticipants
} from '@/lib/electronic-contracts/signer-participant-validation';
import { normalizeLeadContractChecklistStepKey } from '@/lib/franchise-lead-contract-checklist';
import { canAccessFranchiseLead } from '@/lib/franchise-lead-access';
import { upsertElectronicContractLeadDocument } from '@/lib/franchise-lead-documents';
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
    readonly lead_id: string | null;
    readonly sent_by_profile_id: string | null;
    readonly status: string | null;
    readonly template_source: string | null;
};

type LeadRow = {
    readonly id: string;
    readonly company_id: string;
    readonly manager_id: string | null;
    readonly created_by: string | null;
};

type ContractEventDocumentRow = {
    readonly ucansign_document_id: string | null;
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

function readLeadRow(value: unknown): LeadRow | null {
    if (!isRecord(value)) return null;
    const id = textValue(value, 'id');
    const companyId = textValue(value, 'company_id');
    if (!id || !companyId) return null;
    return {
        id,
        company_id: companyId,
        manager_id: textValue(value, 'manager_id') || null,
        created_by: textValue(value, 'created_by') || null
    };
}

async function fetchLinkedLead(
    supabaseAdmin: SupabaseClient,
    leadId: string
) {
    const { data, error } = await supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, created_by')
        .eq('id', leadId)
        .maybeSingle();
    return { lead: readLeadRow(data), error };
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

async function markCompanyTemplateContractSent(
    supabaseAdmin: SupabaseClient,
    contractId: string,
    ucansignDocumentId: string
): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
        .from('electronic_contracts')
        .update({
            status: 'sent',
            ucansign_document_id: ucansignDocumentId,
            sent_at: now,
            updated_at: now
        })
        .eq('id', contractId);
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
        let existingLeadId = '';
        if (draftContractId) {
            const { data: draft, error: draftError } = await supabaseAdmin
                .from('electronic_contracts')
                .select('id, company_id, lead_id, sent_by_profile_id, status, template_source')
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
            existingLeadId = draft.lead_id || '';
        }

        const requestedLeadId = textValue(body, 'leadId') || textValue(body, 'lead_id') || existingLeadId;
        const requestedChecklistStepKey = normalizeLeadContractChecklistStepKey(
            textValue(body, 'checklistStepKey') || textValue(body, 'checklist_step_key')
        );
        if (requestedLeadId) {
            const { lead, error: leadError } = await fetchLinkedLead(supabaseAdmin, requestedLeadId);
            if (leadError) throw leadError;
            if (!lead) return fail(404, 'NOT_FOUND', 'Franchise lead not found');
            if (lead.company_id !== access.template.company_id) return fail(403, 'FORBIDDEN', 'Lead company scope mismatch');
            if (!canAccessFranchiseLead(requester, lead)) return fail(403, 'FORBIDDEN', 'Lead access denied');
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

        const participants = parseRequestSignerParticipants(body.participants);
        const missingRoles = missingRequiredSignerLabels(effectiveRoles, participants);
        if (missingRoles.length > 0) {
            return fail(400, 'VALIDATION_ERROR', `서명자 정보를 확인해주세요: ${missingRoles.join(', ')}`);
        }
        const invalidContacts = invalidSignerContactLabels(effectiveRoles, participants);
        if (invalidContacts.length > 0) {
            return fail(400, 'VALIDATION_ERROR', `서명자 연락처 형식을 확인해주세요: ${invalidContacts.join(', ')}`);
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
            lead_id: requestedLeadId || null,
            name: documentName,
            status: 'sending',
            form_snapshot: {
                companyName: company?.name || '',
                templateName: access.template.name,
                leadId: requestedLeadId,
                checklistStepKey: requestedChecklistStepKey || '',
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

        await markCompanyTemplateContractSent(supabaseAdmin, contractId, ucansignDocumentId);

        let documentLinkWarning = '';
        if (requestedLeadId) {
            try {
                await upsertElectronicContractLeadDocument(supabaseAdmin, {
                    companyId: access.template.company_id,
                    leadId: requestedLeadId,
                    contractId,
                    checklistStepKey: requestedChecklistStepKey || undefined,
                    title: documentName,
                    documentStatus: 'sent',
                    requesterId: requester.id
                });
            } catch (linkError) {
                documentLinkWarning = 'DOCUMENT_LINK_FAILED';
                console.error('Company template document box link error:', linkError);
            }
        }

        return ok({
            contractId,
            ucansignDocumentId,
            status: 'sent',
            ...(documentLinkWarning ? { warning: documentLinkWarning } : {})
        }, 201);
    } catch (error) {
        console.error('Company template electronic contract send error:', error);
        const recordedDocumentId = await latestRecordedProviderDocument(supabaseAdmin, contractId).catch(() => '');
        if (recordedDocumentId) {
            await markCompanyTemplateContractSent(supabaseAdmin, contractId, recordedDocumentId).catch(() => null);
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
        const message = error instanceof UcansignPlatformError ? error.message : '회사 템플릿 전자계약 발송에 실패했습니다.';
        return fail(500, 'INTERNAL_ERROR', message);
    }
}
