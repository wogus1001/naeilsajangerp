import { canAccessCompanyScope, getRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { canAccessFranchiseLead } from '@/lib/franchise-lead-access';
import {
    buildLeadContractChecklistUpsert,
    mergeLeadContractChecklistSteps,
    normalizeLeadContractChecklistStepKey,
    summarizeLeadContractChecklist,
    type LeadContractApplicability,
    type LeadContractChecklistDocumentSummary,
    UnknownLeadContractChecklistStepError,
    type LeadContractChecklistStepInput
} from '@/lib/franchise-lead-contract-checklist';
import {
    buildChecklistDocumentSummaries,
    type FranchiseLeadDocumentChecklistLinkInput,
    type FranchiseLeadDocumentInput
} from '@/lib/franchise-lead-documents';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;

type LeadAccessRow = {
    readonly id: string;
    readonly company_id: string;
    readonly manager_id: string | null;
    readonly created_by: string | null;
};

type ProfileNameRow = {
    readonly id: string;
    readonly name: string | null;
    readonly email: string | null;
};

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function getFirst(body: JsonRecord, keys: readonly string[]) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
    }
    return undefined;
}

function hasOwn(body: JsonRecord, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(body, key);
}

function requesterFallback(body: JsonRecord) {
    return cleanString(getFirst(body, ['requesterId', 'userId', 'managerId', 'manager_id']));
}

async function readBody(request: Request): Promise<JsonRecord> {
    try {
        const parsed = await request.json();
        return isRecord(parsed) ? parsed : {};
    } catch (error) {
        if (error instanceof SyntaxError) return {};
        throw error;
    }
}

function readOptionalBoolean(value: unknown): boolean | null {
    if (value === true || value === false) return value;
    const raw = cleanString(value)?.toLowerCase();
    if (!raw) return null;
    if (['true', '1', 'yes', 'y', '완료'].includes(raw)) return true;
    if (['false', '0', 'no', 'n', '대기'].includes(raw)) return false;
    return null;
}

function readLeadRow(value: unknown): LeadAccessRow | null {
    if (!isRecord(value)) return null;
    const id = cleanString(value.id);
    const companyId = cleanString(value.company_id);
    if (!id || !companyId) return null;
    return {
        id,
        company_id: companyId,
        manager_id: cleanString(value.manager_id),
        created_by: cleanString(value.created_by)
    };
}

function readChecklistRow(value: unknown): LeadContractChecklistStepInput | null {
    if (!isRecord(value)) return null;
    return {
        step_key: value.step_key,
        label: value.label,
        required: value.required,
        requirement_type: value.requirement_type,
        basis_type: value.basis_type,
        basis_text: value.basis_text,
        owner_team: value.owner_team,
        applicability: value.applicability,
        required_evidence: value.required_evidence,
        completed: value.completed,
        completed_at: value.completed_at,
        completed_by: value.completed_by,
        memo: value.memo,
        sort_order: value.sort_order,
        updated_at: value.updated_at
    };
}

function readDocumentRow(value: unknown): FranchiseLeadDocumentInput | null {
    if (!isRecord(value)) return null;
    return {
        id: value.id,
        company_id: value.company_id,
        lead_id: value.lead_id,
        title: value.title,
        document_status: value.document_status,
        status: value.status,
        memo: value.memo,
        created_by: value.created_by,
        created_at: value.created_at,
        updated_at: value.updated_at
    };
}

function readLinkRow(value: unknown): FranchiseLeadDocumentChecklistLinkInput | null {
    if (!isRecord(value)) return null;
    return {
        id: value.id,
        company_id: value.company_id,
        lead_id: value.lead_id,
        lead_document_id: value.lead_document_id,
        step_key: value.step_key,
        created_at: value.created_at
    };
}

function getErrorCode(error: unknown) {
    return isRecord(error) && typeof error.code === 'string' ? error.code : '';
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return isRecord(error) && typeof error.message === 'string' ? error.message : '';
}

function isMissingChecklistSchemaError(error: unknown) {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code)
        && /franchise_lead_contract_checklist_steps|franchise_lead_documents|franchise_lead_document_checklist_links/i.test(message);
}

function handleChecklistError(error: unknown, action: string) {
    console.error(`Franchise lead contract checklist ${action} error:`, error);
    if (isMissingChecklistSchemaError(error)) {
        return fail(
            424,
            'VALIDATION_ERROR',
            '계약 전 체크리스트 테이블이 아직 적용되지 않았습니다. supabase_franchise_contract_checklist_migration.sql 적용 후 다시 확인해주세요.'
        );
    }
    if (error instanceof UnknownLeadContractChecklistStepError) {
        return fail(400, 'VALIDATION_ERROR', 'Unknown checklist step');
    }
    return fail(500, 'INTERNAL_ERROR', `Failed to ${action.toLowerCase()} contract checklist`);
}

async function fetchLead(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    leadId: string
) {
    const { data, error } = await supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, created_by')
        .eq('id', leadId)
        .single();
    return { lead: readLeadRow(data), error };
}

function readChecklistRows(data: unknown) {
    return Array.isArray(data)
        ? data.map(readChecklistRow).filter((step): step is LeadContractChecklistStepInput => step !== null)
        : [];
}

function readRows<T>(data: unknown, reader: (value: unknown) => T | null): readonly T[] {
    return Array.isArray(data)
        ? data.map(reader).filter((row): row is T => row !== null)
        : [];
}

function readProfileNameRow(value: unknown): ProfileNameRow | null {
    if (!isRecord(value)) return null;
    const id = cleanString(value.id);
    if (!id) return null;
    return {
        id,
        name: cleanString(value.name),
        email: cleanString(value.email)
    };
}

function displayProfileName(profile: ProfileNameRow): string {
    return profile.name || profile.email || profile.id;
}

async function fetchProfileNamesById(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    profileIds: readonly string[]
): Promise<ReadonlyMap<string, string>> {
    const uniqueIds = Array.from(new Set(profileIds.map(cleanString).filter(Boolean)));
    if (uniqueIds.length === 0) return new Map();

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email')
        .in('id', uniqueIds);
    if (error) throw error;

    return new Map(readRows(data, readProfileNameRow).map(profile => [profile.id, displayProfileName(profile)]));
}

async function fetchChecklistSteps(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    leadId: string,
    companyId: string
) {
    const { data, error } = await supabaseAdmin
        .from('franchise_lead_contract_checklist_steps')
        .select('*')
        .eq('lead_id', leadId)
        .eq('company_id', companyId)
        .order('sort_order', { ascending: true });
    if (error) throw error;
    return readChecklistRows(data);
}

async function fetchDocumentSummaries(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    leadId: string,
    companyId: string
): Promise<Record<string, LeadContractChecklistDocumentSummary>> {
    const [{ data: documentData, error: documentError }, { data: linkData, error: linkError }] = await Promise.all([
        supabaseAdmin
            .from('franchise_lead_documents')
            .select('id, company_id, lead_id, title, document_status, status, memo, created_by, created_at, updated_at')
            .eq('lead_id', leadId)
            .eq('company_id', companyId)
            .neq('status', 'archived'),
        supabaseAdmin
            .from('franchise_lead_document_checklist_links')
            .select('*')
            .eq('lead_id', leadId)
            .eq('company_id', companyId)
    ]);
    if (documentError) throw documentError;
    if (linkError) throw linkError;
    const documents = readRows(documentData, readDocumentRow);
    const creatorIds = documents
        .map(document => cleanString(document.created_by ?? document.createdBy))
        .filter((id): id is string => Boolean(id));
    const profileNamesById = await fetchProfileNamesById(
        supabaseAdmin,
        creatorIds
    );
    return buildChecklistDocumentSummaries(
        documents,
        readRows(linkData, readLinkRow),
        profileNamesById
    );
}

function readApplicabilityPatch(value: unknown): LeadContractApplicability | null | undefined {
    if (value === undefined) return undefined;
    const raw = cleanString(value);
    if (!raw) return null;
    if (raw === 'applicable' || raw === 'not_applicable') return raw;
    return null;
}

function buildChecklistResponse(
    savedSteps: readonly LeadContractChecklistStepInput[],
    documentSummaries: Record<string, LeadContractChecklistDocumentSummary>
) {
    return {
        steps: mergeLeadContractChecklistSteps(savedSteps, documentSummaries),
        summary: summarizeLeadContractChecklist(savedSteps, documentSummaries)
    };
}

function buildUpsertPayload(
    payload: ReturnType<typeof buildLeadContractChecklistUpsert>,
    existingData: unknown,
    nowIso: string
) {
    if (existingData) return payload;
    return {
        ...payload,
        created_at: nowIso
    };
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const { searchParams } = new URL(request.url);
        const leadId = searchParams.get('leadId') || searchParams.get('lead_id');
        if (!leadId) return fail(400, 'VALIDATION_ERROR', 'leadId is required');

        const { lead, error: leadError } = await fetchLead(supabaseAdmin, leadId);
        if (leadError || !lead) return fail(404, 'NOT_FOUND', 'Franchise lead not found');
        if (!canAccessFranchiseLead(requester, lead)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');

        const [savedSteps, documentSummaries] = await Promise.all([
            fetchChecklistSteps(supabaseAdmin, lead.id, lead.company_id),
            fetchDocumentSummaries(supabaseAdmin, lead.id, lead.company_id)
        ]);
        return ok(buildChecklistResponse(savedSteps, documentSummaries));
    } catch (error) {
        return handleChecklistError(error, 'GET');
    }
}

export async function PUT(request: Request) {
    try {
        const body = await readBody(request);
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request, requesterFallback(body));
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const leadId = cleanString(getFirst(body, ['leadId', 'lead_id']));
        const stepKey = normalizeLeadContractChecklistStepKey(getFirst(body, ['stepKey', 'step_key']));
        if (!leadId) return fail(400, 'VALIDATION_ERROR', 'leadId is required');
        if (!stepKey) return fail(400, 'VALIDATION_ERROR', 'stepKey is invalid');

        const { lead, error: leadError } = await fetchLead(supabaseAdmin, leadId);
        if (leadError || !lead) return fail(404, 'NOT_FOUND', 'Franchise lead not found');
        if (!canAccessFranchiseLead(requester, lead)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        if (!canAccessCompanyScope(requester, lead.company_id)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied');

        const { data: existingData, error: existingError } = await supabaseAdmin
            .from('franchise_lead_contract_checklist_steps')
            .select('*')
            .eq('lead_id', lead.id)
            .eq('company_id', lead.company_id)
            .eq('step_key', stepKey)
            .maybeSingle();
        if (existingError) throw existingError;

        const hasCompletedPatch = hasOwn(body, 'completed');
        const completed = hasCompletedPatch ? readOptionalBoolean(body.completed) : undefined;
        if (hasCompletedPatch && completed === null) return fail(400, 'VALIDATION_ERROR', 'completed is invalid');
        const hasApplicabilityPatch = hasOwn(body, 'applicability');
        const applicability = hasApplicabilityPatch ? readApplicabilityPatch(body.applicability) : undefined;
        if (hasApplicabilityPatch && applicability === null) return fail(400, 'VALIDATION_ERROR', 'applicability is invalid');

        const nowIso = new Date().toISOString();
        const payload = buildLeadContractChecklistUpsert({
            companyId: lead.company_id,
            leadId: lead.id,
            requesterId: requester.id,
            stepKey,
            completed,
            applicability,
            memo: hasOwn(body, 'memo') ? body.memo : undefined,
            nowIso,
            existing: readChecklistRow(existingData)
        });

        const { data, error } = await supabaseAdmin
            .from('franchise_lead_contract_checklist_steps')
            .upsert(buildUpsertPayload(payload, existingData, nowIso), { onConflict: 'lead_id,step_key' })
            .select()
            .single();
        if (error) throw error;

        const [savedSteps, documentSummaries] = await Promise.all([
            fetchChecklistSteps(supabaseAdmin, lead.id, lead.company_id),
            fetchDocumentSummaries(supabaseAdmin, lead.id, lead.company_id)
        ]);
        const savedStep = mergeLeadContractChecklistSteps(readChecklistRows([data]), documentSummaries)
            .find(step => step.stepKey === stepKey);
        return ok({
            step: savedStep,
            ...buildChecklistResponse(savedSteps, documentSummaries)
        });
    } catch (error) {
        return handleChecklistError(error, 'SAVE');
    }
}

export async function POST(request: Request) {
    return PUT(request);
}
