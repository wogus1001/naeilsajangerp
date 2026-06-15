import { canAccessCompanyResource, getRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
    buildLeadContractChecklistSummaryMap,
    filterLeadContractChecklistRowsByLeadCompany,
    type LeadContractChecklistSummaryRowInput
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

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function parseLeadIds(value: string | null): readonly string[] {
    const uniqueIds = new Set(
        cleanString(value)
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
    );
    return Array.from(uniqueIds).slice(0, 250);
}

function readLeadRow(value: unknown): LeadAccessRow | null {
    if (!isRecord(value)) return null;
    const id = cleanString(value.id);
    const companyId = cleanString(value.company_id);
    if (!id || !companyId) return null;
    return {
        id,
        company_id: companyId,
        manager_id: cleanString(value.manager_id) || null
    };
}

function readChecklistRow(value: unknown): LeadContractChecklistSummaryRowInput | null {
    if (!isRecord(value)) return null;
    return {
        company_id: value.company_id,
        lead_id: value.lead_id,
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

function readRows<T>(data: unknown, reader: (value: unknown) => T | null): readonly T[] {
    return Array.isArray(data)
        ? data.map(reader).filter((row): row is T => row !== null)
        : [];
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

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const requester = await getRequesterProfile(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'requesterId is required');

        const { searchParams } = new URL(request.url);
        const leadIds = parseLeadIds(searchParams.get('leadIds') || searchParams.get('lead_ids'));
        if (leadIds.length === 0) {
            return ok({ summaries: {}, schemaReady: true });
        }

        const { data: leadData, error: leadError } = await supabaseAdmin
            .from('franchise_leads')
            .select('id, company_id, manager_id')
            .in('id', leadIds);
        if (leadError) throw leadError;

        const leads = readRows(leadData, readLeadRow);
        if (leads.length !== leadIds.length) {
            return fail(404, 'NOT_FOUND', 'Some franchise leads were not found');
        }
        if (leads.some(lead => !canAccessCompanyResource(requester, lead))) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');
        }

        const { data: stepData, error: stepError } = await supabaseAdmin
            .from('franchise_lead_contract_checklist_steps')
            .select('*')
            .in('lead_id', leadIds)
            .order('sort_order', { ascending: true });

        if (stepError) {
            if (isMissingChecklistSchemaError(stepError)) {
                return ok({
                    summaries: buildLeadContractChecklistSummaryMap(leadIds, [], false),
                    schemaReady: false
                });
            }
            throw stepError;
        }

        return ok({
            summaries: buildLeadContractChecklistSummaryMap(
                leadIds,
                filterLeadContractChecklistRowsByLeadCompany(readRows(stepData, readChecklistRow), leads)
            ),
            schemaReady: true
        });
    } catch (error) {
        console.error('Franchise lead contract checklist summaries GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch contract checklist summaries');
    }
}
