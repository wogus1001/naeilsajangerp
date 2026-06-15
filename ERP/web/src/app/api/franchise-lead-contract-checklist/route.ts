import { canAccessCompanyResource, canAccessCompanyScope, getRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildLeadContractChecklistUpsert,
    mergeLeadContractChecklistSteps,
    normalizeLeadContractChecklistStepKey,
    summarizeLeadContractChecklist,
    UnknownLeadContractChecklistStepError,
    type LeadContractChecklistStepInput
} from '@/lib/franchise-lead-contract-checklist';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;

type LeadAccessRow = {
    readonly id: string;
    readonly company_id: string;
    readonly manager_id: string | null;
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
        manager_id: cleanString(value.manager_id)
    };
}

function readChecklistRow(value: unknown): LeadContractChecklistStepInput | null {
    if (!isRecord(value)) return null;
    return {
        step_key: value.step_key,
        label: value.label,
        required: value.required,
        completed: value.completed,
        completed_at: value.completed_at,
        completed_by: value.completed_by,
        memo: value.memo,
        sort_order: value.sort_order,
        updated_at: value.updated_at
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
        && /franchise_lead_contract_checklist_steps/i.test(message);
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
        .select('id, company_id, manager_id')
        .eq('id', leadId)
        .single();
    return { lead: readLeadRow(data), error };
}

function readChecklistRows(data: unknown) {
    return Array.isArray(data)
        ? data.map(readChecklistRow).filter((step): step is LeadContractChecklistStepInput => step !== null)
        : [];
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

function buildChecklistResponse(savedSteps: readonly LeadContractChecklistStepInput[]) {
    return {
        steps: mergeLeadContractChecklistSteps(savedSteps),
        summary: summarizeLeadContractChecklist(savedSteps)
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
        if (!canAccessCompanyResource(requester, lead)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');

        const savedSteps = await fetchChecklistSteps(supabaseAdmin, lead.id, lead.company_id);
        return ok(buildChecklistResponse(savedSteps));
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
        if (!canAccessCompanyResource(requester, lead)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
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

        const nowIso = new Date().toISOString();
        const payload = buildLeadContractChecklistUpsert({
            companyId: lead.company_id,
            leadId: lead.id,
            requesterId: requester.id,
            stepKey,
            completed,
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

        const savedSteps = await fetchChecklistSteps(supabaseAdmin, lead.id, lead.company_id);
        const savedStep = mergeLeadContractChecklistSteps(readChecklistRows([data]))
            .find(step => step.stepKey === stepKey);
        return ok({
            step: savedStep,
            ...buildChecklistResponse(savedSteps)
        });
    } catch (error) {
        return handleChecklistError(error, 'SAVE');
    }
}

export async function POST(request: Request) {
    return PUT(request);
}
