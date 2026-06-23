import { getRequesterProfile } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { canAccessFranchiseLead } from '@/lib/franchise-lead-access';
import {
    buildLeadContractChecklistSummaryMap,
    filterLeadContractChecklistRowsByLeadCompany,
    type LeadContractChecklistSummaryRowInput
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
        manager_id: cleanString(value.manager_id) || null,
        created_by: cleanString(value.created_by) || null
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
        name: cleanString(value.name) || null,
        email: cleanString(value.email) || null
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

function groupDocumentSummariesByLeadId(
    documents: readonly FranchiseLeadDocumentInput[],
    links: readonly FranchiseLeadDocumentChecklistLinkInput[],
    profileNamesById: ReadonlyMap<string, string>
) {
    const documentsByLeadId = new Map<string, FranchiseLeadDocumentInput[]>();
    documents.forEach(document => {
        const leadId = cleanString(document.leadId ?? document.lead_id);
        if (!leadId) return;
        const rows = documentsByLeadId.get(leadId) || [];
        rows.push(document);
        documentsByLeadId.set(leadId, rows);
    });

    const linksByLeadId = new Map<string, FranchiseLeadDocumentChecklistLinkInput[]>();
    links.forEach(link => {
        const leadId = cleanString(link.leadId ?? link.lead_id);
        if (!leadId) return;
        const rows = linksByLeadId.get(leadId) || [];
        rows.push(link);
        linksByLeadId.set(leadId, rows);
    });

    return Array.from(new Set([...documentsByLeadId.keys(), ...linksByLeadId.keys()]))
        .reduce<Record<string, ReturnType<typeof buildChecklistDocumentSummaries>>>((acc, leadId) => {
            acc[leadId] = buildChecklistDocumentSummaries(
                documentsByLeadId.get(leadId) || [],
                linksByLeadId.get(leadId) || [],
                profileNamesById
            );
            return acc;
        }, {});
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
            .select('id, company_id, manager_id, created_by')
            .in('id', leadIds);
        if (leadError) throw leadError;

        const leads = readRows(leadData, readLeadRow);
        if (leads.length !== leadIds.length) {
            return fail(404, 'NOT_FOUND', 'Some franchise leads were not found');
        }
        if (leads.some(lead => !canAccessFranchiseLead(requester, lead))) {
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

        const [{ data: documentData, error: documentError }, { data: linkData, error: linkError }] = await Promise.all([
            supabaseAdmin
                .from('franchise_lead_documents')
                .select('id, company_id, lead_id, title, document_status, status, memo, created_by, created_at, updated_at')
                .in('lead_id', leadIds)
                .neq('status', 'archived'),
            supabaseAdmin
                .from('franchise_lead_document_checklist_links')
                .select('*')
                .in('lead_id', leadIds)
        ]);
        if (documentError) {
            if (isMissingChecklistSchemaError(documentError)) {
                return ok({
                    summaries: buildLeadContractChecklistSummaryMap(leadIds, readRows(stepData, readChecklistRow), false),
                    schemaReady: false
                });
            }
            throw documentError;
        }
        if (linkError) {
            if (isMissingChecklistSchemaError(linkError)) {
                return ok({
                    summaries: buildLeadContractChecklistSummaryMap(leadIds, readRows(stepData, readChecklistRow), false),
                    schemaReady: false
                });
            }
            throw linkError;
        }
        const documents = readRows(documentData, readDocumentRow);
        const creatorIds = documents
            .map(document => cleanString(document.created_by ?? document.createdBy))
            .filter(Boolean);
        const profileNamesById = await fetchProfileNamesById(supabaseAdmin, creatorIds);

        return ok({
            summaries: buildLeadContractChecklistSummaryMap(
                leadIds,
                filterLeadContractChecklistRowsByLeadCompany(readRows(stepData, readChecklistRow), leads),
                true,
                groupDocumentSummariesByLeadId(
                    documents,
                    readRows(linkData, readLinkRow),
                    profileNamesById
                )
            ),
            schemaReady: true
        });
    } catch (error) {
        console.error('Franchise lead contract checklist summaries GET error:', error);
        return fail(500, 'INTERNAL_ERROR', 'Failed to fetch contract checklist summaries');
    }
}
