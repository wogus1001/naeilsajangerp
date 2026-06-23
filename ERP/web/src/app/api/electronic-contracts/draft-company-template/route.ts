import { getAuthenticatedRequesterProfile, isAdmin } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { normalizeLeadContractChecklistStepKey } from '@/lib/franchise-lead-contract-checklist';
import { canAccessFranchiseLead } from '@/lib/franchise-lead-access';
import { upsertElectronicContractLeadDocument } from '@/lib/franchise-lead-documents';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
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

type DraftParticipant = {
    readonly roleKey: string;
    readonly name: string;
    readonly contact: string;
};

function inputMode(value: unknown): 'erp' | 'template' {
    return value === 'template' ? 'template' : 'erp';
}

function recordValues(value: unknown): Record<string, string> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
        Object.entries(value).map(([key, fieldValue]) => [key, typeof fieldValue === 'string' ? fieldValue.trim() : ''])
    );
}

function draftParticipants(value: unknown): readonly DraftParticipant[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord).map(row => ({
        roleKey: textValue(row, 'roleKey'),
        name: textValue(row, 'name'),
        contact: textValue(row, 'contact')
    })).filter(participant => participant.roleKey);
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
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    leadId: string
) {
    const { data, error } = await supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, created_by')
        .eq('id', leadId)
        .maybeSingle();
    return { lead: readLeadRow(data), error };
}

export async function POST(request: Request) {
    try {
        const body: unknown = await request.json();
        if (!isRecord(body)) return fail(400, 'VALIDATION_ERROR', 'Invalid company template draft payload');

        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getAuthenticatedRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const templateId = textValue(body, 'templateId');
        const versionId = textValue(body, 'versionId');
        if (!templateId || !versionId) return fail(400, 'VALIDATION_ERROR', '템플릿 정보가 필요합니다.');

        const access = await fetchTemplateForRequester(supabaseAdmin, requester, templateId);
        if (!access.ok) return fail(access.status, access.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', access.message);
        if (!isAdmin(requester) && access.template.company_id !== requester.company_id) {
            return fail(403, 'FORBIDDEN', '회사 범위가 일치하지 않습니다.');
        }

        const details = await fetchVersionDetails(supabaseAdmin, versionId);
        if (!details.version || details.version.template_id !== templateId) return fail(404, 'NOT_FOUND', '템플릿 버전을 찾을 수 없습니다.');

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
                return fail(400, 'VALIDATION_ERROR', 'Only draft or failed contracts can be saved');
            }
            if (draft.template_source !== 'company_uploaded') return fail(400, 'VALIDATION_ERROR', '회사 템플릿 초안이 아닙니다.');
            if (!isAdmin(requester) && draft.sent_by_profile_id !== requester.id) return fail(403, 'FORBIDDEN', 'Draft owner required');
            if (draft.company_id !== access.template.company_id) return fail(403, 'FORBIDDEN', 'Company scope mismatch');
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

        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('name')
            .eq('id', access.template.company_id)
            .maybeSingle<CompanyRow>();

        const values = recordValues(body.values);
        const participants = draftParticipants(body.participants);
        const nextInputMode = inputMode(body.inputMode);
        const contractId = draftContractId || crypto.randomUUID();
        const now = new Date().toISOString();
        const documentName = `[${company?.name || '회사'}] ${access.template.name}`;
        const row = {
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
            status: 'draft',
            form_snapshot: {
                companyName: company?.name || '',
                templateName: access.template.name,
                leadId: requestedLeadId,
                checklistStepKey: requestedChecklistStepKey || '',
                inputMode: nextInputMode,
                values,
                participants
            },
            payload_snapshot: {},
            updated_at: now
        };

        const { error } = draftContractId
            ? await supabaseAdmin.from('electronic_contracts').update(row).eq('id', contractId)
            : await supabaseAdmin.from('electronic_contracts').insert({ ...row, created_at: now });
        if (error) throw error;

        if (requestedLeadId) {
            await upsertElectronicContractLeadDocument(supabaseAdmin, {
                companyId: access.template.company_id,
                leadId: requestedLeadId,
                contractId,
                checklistStepKey: requestedChecklistStepKey || undefined,
                title: documentName,
                documentStatus: 'draft',
                requesterId: requester.id,
                nowIso: now
            });
        }

        return ok({ contractId, status: 'draft', updatedAt: now });
    } catch (error) {
        console.error('Company template electronic contract draft save error:', error);
        return fail(500, 'INTERNAL_ERROR', '회사 템플릿 초안을 저장하지 못했습니다.');
    }
}
