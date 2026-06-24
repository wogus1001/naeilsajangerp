import {
    canAccessCompanyScope,
    getAuthenticatedRequesterProfile,
    type RequesterProfile
} from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { canAccessFranchiseLead } from '@/lib/franchise-lead-access';
import {
    buildLeadDocumentStorageData,
    readLeadDocumentScopedStorageTarget
} from '@/lib/franchise-lead-document-storage';
import {
    attachChecklistLinksToDocuments,
    normalizeFranchiseLeadDocumentSourceType,
    type FranchiseLeadDocumentChecklistLinkInput,
    type FranchiseLeadDocumentInput
} from '@/lib/franchise-lead-documents';
import { normalizeLeadContractChecklistStepKey } from '@/lib/franchise-lead-contract-checklist';
import { getSupabaseAdmin as createSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type JsonRecord = Record<string, unknown>;
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type LeadDocumentRouteDependencies = {
    readonly getSupabaseAdmin: () => SupabaseAdminClient;
    readonly resolveRequester: (
        supabaseAdmin: SupabaseAdminClient,
        request: Request
    ) => Promise<RequesterProfile | null>;
};

type LeadAccessRow = {
    readonly id: string;
    readonly company_id: string;
    readonly manager_id: string | null;
    readonly created_by: string | null;
};

function createDefaultRouteDependencies(): LeadDocumentRouteDependencies {
    return {
        getSupabaseAdmin: createSupabaseAdminClient,
        resolveRequester: getAuthenticatedRequesterProfile
    };
}

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

async function readBody(request: Request): Promise<JsonRecord> {
    try {
        const parsed = await request.json();
        return isRecord(parsed) ? parsed : {};
    } catch (error) {
        if (error instanceof SyntaxError) return {};
        throw error;
    }
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

function readDocumentRow(value: unknown): FranchiseLeadDocumentInput | null {
    if (!isRecord(value)) return null;
    return {
        id: value.id,
        company_id: value.company_id,
        lead_id: value.lead_id,
        source_type: value.source_type,
        source_id: value.source_id,
        title: value.title,
        document_status: value.document_status,
        file_url: value.file_url,
        file_name: value.file_name,
        memo: value.memo,
        status: value.status,
        created_by: value.created_by,
        created_at: value.created_at,
        updated_at: value.updated_at,
        data: value.data
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

function getErrorCode(error: unknown) {
    return isRecord(error) && typeof error.code === 'string' ? error.code : '';
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return isRecord(error) && typeof error.message === 'string' ? error.message : '';
}

function isMissingLeadDocumentSchemaError(error: unknown) {
    const code = getErrorCode(error);
    const message = getErrorMessage(error);
    return ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code)
        && /franchise_lead_documents|franchise_lead_document_checklist_links/i.test(message);
}

function handleLeadDocumentError(error: unknown, action: string) {
    console.error(`Franchise lead documents ${action} error:`, error);
    if (isMissingLeadDocumentSchemaError(error)) {
        return fail(
            424,
            'VALIDATION_ERROR',
            '점주 문서함 테이블이 아직 적용되지 않았습니다. supabase_franchise_lead_documents_migration.sql 적용 후 다시 확인해주세요.'
        );
    }
    return fail(500, 'INTERNAL_ERROR', `Failed to ${action.toLowerCase()} franchise lead documents`);
}

async function fetchLead(
    supabaseAdmin: SupabaseAdminClient,
    leadId: string
) {
    const { data, error } = await supabaseAdmin
        .from('franchise_leads')
        .select('id, company_id, manager_id, created_by')
        .eq('id', leadId)
        .single();
    return { lead: readLeadRow(data), error };
}

async function fetchDocument(
    supabaseAdmin: SupabaseAdminClient,
    documentId: string
) {
    const { data, error } = await supabaseAdmin
        .from('franchise_lead_documents')
        .select('*')
        .eq('id', documentId)
        .maybeSingle();
    return { document: readDocumentRow(data), error };
}

async function fetchLeadDocumentState(
    supabaseAdmin: SupabaseAdminClient,
    leadId: string,
    companyId: string
) {
    const [{ data: documentData, error: documentError }, { data: linkData, error: linkError }] = await Promise.all([
        supabaseAdmin
            .from('franchise_lead_documents')
            .select('*')
            .eq('lead_id', leadId)
            .eq('company_id', companyId)
            .neq('status', 'archived')
            .order('updated_at', { ascending: false }),
        supabaseAdmin
            .from('franchise_lead_document_checklist_links')
            .select('*')
            .eq('lead_id', leadId)
            .eq('company_id', companyId)
    ]);
    if (documentError) throw documentError;
    if (linkError) throw linkError;

    const documents = readRows(documentData, readDocumentRow);
    const links = readRows(linkData, readLinkRow);
    return {
        documents: attachChecklistLinksToDocuments(documents, links),
        links
    };
}

async function assertLeadAccess(
    supabaseAdmin: SupabaseAdminClient,
    request: Request,
    leadId: string,
    dependencies: LeadDocumentRouteDependencies
) {
    const requester = await dependencies.resolveRequester(supabaseAdmin, request);
    if (!requester) return { requester: null, lead: null, response: fail(401, 'AUTH_REQUIRED', 'authenticated session is required') };

    const { lead, error: leadError } = await fetchLead(supabaseAdmin, leadId);
    if (leadError || !lead) return { requester, lead: null, response: fail(404, 'NOT_FOUND', 'Franchise lead not found') };
    if (!canAccessFranchiseLead(requester, lead)) {
        return { requester, lead, response: fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied') };
    }
    return { requester, lead, response: null };
}

async function assertElectronicContractDocumentAccess(
    supabaseAdmin: SupabaseAdminClient,
    sourceId: string,
    scope: {
        readonly companyId: string;
        readonly leadId: string;
    }
) {
    if (!sourceId) return fail(400, 'VALIDATION_ERROR', 'electronic contract sourceId is required');
    const { data, error } = await supabaseAdmin
        .from('electronic_contracts')
        .select('id, company_id, lead_id')
        .eq('id', sourceId)
        .maybeSingle();
    if (error) throw error;
    if (!isRecord(data)) return fail(400, 'VALIDATION_ERROR', '전자계약 문서를 확인할 수 없습니다.');
    if (cleanString(data.company_id) !== scope.companyId || cleanString(data.lead_id) !== scope.leadId) {
        return fail(403, 'FORBIDDEN', '전자계약 문서의 후보자 범위가 일치하지 않습니다.');
    }
    return null;
}

async function openLeadDocument(
    supabaseAdmin: SupabaseAdminClient,
    request: Request,
    documentId: string,
    dependencies: LeadDocumentRouteDependencies
) {
    const { document, error: documentError } = await fetchDocument(supabaseAdmin, documentId);
    if (documentError || !document) return fail(404, 'NOT_FOUND', 'Document not found');
    if (cleanString(document.status) === 'archived') return fail(404, 'NOT_FOUND', 'Document not found');
    const leadId = cleanString(document.lead_id);
    if (!leadId) return fail(404, 'NOT_FOUND', 'Franchise lead not found');

    const access = await assertLeadAccess(supabaseAdmin, request, leadId, dependencies);
    if (access.response) return access.response;
    if (!access.lead) return fail(404, 'NOT_FOUND', 'Franchise lead not found');

    const storageTarget = readLeadDocumentScopedStorageTarget(document, {
        companyId: access.lead.company_id,
        leadId: access.lead.id
    });
    if (!storageTarget) return fail(400, 'VALIDATION_ERROR', '열람할 업로드 문서 경로를 확인할 수 없습니다.');

    const expiresIn = 300;
    const { data, error } = await supabaseAdmin.storage
        .from(storageTarget.bucket)
        .createSignedUrl(storageTarget.path, expiresIn);
    if (error || !data?.signedUrl) throw error || new Error('Signed URL is missing');
    return ok({ expiresIn, url: data.signedUrl });
}

export async function handleLeadDocumentsGET(
    request: Request,
    dependencies: LeadDocumentRouteDependencies = createDefaultRouteDependencies()
) {
    try {
        const supabaseAdmin = dependencies.getSupabaseAdmin();
        const requester = await dependencies.resolveRequester(supabaseAdmin, request);
        if (!requester) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || '';
        const documentId = searchParams.get('documentId') || searchParams.get('document_id') || searchParams.get('id') || '';
        if (action === 'open') {
            if (!documentId) return fail(400, 'VALIDATION_ERROR', 'documentId is required');
            return openLeadDocument(supabaseAdmin, request, documentId, dependencies);
        }

        const leadId = searchParams.get('leadId') || searchParams.get('lead_id');
        if (!leadId) return fail(400, 'VALIDATION_ERROR', 'leadId is required');

        const { lead, error: leadError } = await fetchLead(supabaseAdmin, leadId);
        if (leadError || !lead) return fail(404, 'NOT_FOUND', 'Franchise lead not found');
        if (!canAccessFranchiseLead(requester, lead)) return fail(403, 'FORBIDDEN', 'Forbidden: cross-company access denied');

        return ok(await fetchLeadDocumentState(supabaseAdmin, lead.id, lead.company_id));
    } catch (error) {
        return handleLeadDocumentError(error, 'GET');
    }
}

export async function handleLeadDocumentsPOST(
    request: Request,
    dependencies: LeadDocumentRouteDependencies = createDefaultRouteDependencies()
) {
    try {
        const body = await readBody(request);
        const leadId = cleanString(getFirst(body, ['leadId', 'lead_id']));
        if (!leadId) return fail(400, 'VALIDATION_ERROR', 'leadId is required');

        const supabaseAdmin = dependencies.getSupabaseAdmin();
        const access = await assertLeadAccess(supabaseAdmin, request, leadId, dependencies);
        if (access.response) return access.response;
        if (!access.requester || !access.lead) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        if (!canAccessCompanyScope(access.requester, access.lead.company_id)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied');
        }

        const title = cleanString(body.title);
        if (!title) return fail(400, 'VALIDATION_ERROR', 'title is required');
        const sourceType = normalizeFranchiseLeadDocumentSourceType(getFirst(body, ['sourceType', 'source_type']));
        const sourceId = cleanString(getFirst(body, ['sourceId', 'source_id']));
        if (sourceType === 'electronic_contract') {
            const sourceAccessError = await assertElectronicContractDocumentAccess(supabaseAdmin, sourceId || '', {
                companyId: access.lead.company_id,
                leadId: access.lead.id
            });
            if (sourceAccessError) return sourceAccessError;
        }
        const storageData = buildLeadDocumentStorageData({
            storageBucket: getFirst(body, ['storageBucket', 'storage_bucket']),
            storagePath: getFirst(body, ['storagePath', 'storage_path'])
        });
        if (sourceType === 'upload' && !storageData) {
            return fail(400, 'VALIDATION_ERROR', 'Upload document storage path is required');
        }
        if (storageData && !readLeadDocumentScopedStorageTarget({
            source_type: sourceType,
            data: storageData
        }, {
            companyId: access.lead.company_id,
            leadId: access.lead.id
        })) {
            return fail(400, 'VALIDATION_ERROR', 'Invalid document storage path');
        }
        const nowIso = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('franchise_lead_documents')
            .upsert({
                company_id: access.lead.company_id,
                lead_id: access.lead.id,
                source_type: sourceType,
                source_id: sourceId,
                title,
                document_status: cleanString(getFirst(body, ['documentStatus', 'document_status'])) || 'stored',
                file_url: sourceType === 'upload' ? '' : cleanString(getFirst(body, ['fileUrl', 'file_url'])),
                file_name: cleanString(getFirst(body, ['fileName', 'file_name'])),
                memo: cleanString(body.memo),
                status: 'active',
                created_by: access.requester.id,
                updated_at: nowIso,
                ...(storageData ? { data: storageData } : {})
            }, {
                onConflict: 'company_id,lead_id,source_type,source_id'
            })
            .select('*')
            .single();
        if (error) throw error;

        const stepKey = normalizeLeadContractChecklistStepKey(getFirst(body, ['checklistStepKey', 'stepKey', 'step_key']));
        const documentId = cleanString(isRecord(data) ? data.id : null);
        if (stepKey && documentId) {
            const { error: linkError } = await supabaseAdmin
                .from('franchise_lead_document_checklist_links')
                .upsert({
                    company_id: access.lead.company_id,
                    lead_id: access.lead.id,
                    lead_document_id: documentId,
                    step_key: stepKey,
                    created_by: access.requester.id,
                    created_at: nowIso
                }, {
                    onConflict: 'lead_document_id,step_key'
                });
            if (linkError) throw linkError;
        }

        return ok(await fetchLeadDocumentState(supabaseAdmin, access.lead.id, access.lead.company_id), 201);
    } catch (error) {
        return handleLeadDocumentError(error, 'POST');
    }
}

export async function handleLeadDocumentsPATCH(
    request: Request,
    dependencies: LeadDocumentRouteDependencies = createDefaultRouteDependencies()
) {
    try {
        const body = await readBody(request);
        const documentId = cleanString(getFirst(body, ['id', 'documentId', 'document_id']));
        if (!documentId) return fail(400, 'VALIDATION_ERROR', 'documentId is required');

        const supabaseAdmin = dependencies.getSupabaseAdmin();
        const { document, error: documentError } = await fetchDocument(supabaseAdmin, documentId);
        if (documentError || !document) return fail(404, 'NOT_FOUND', 'Document not found');
        const leadId = cleanString(document.lead_id);
        if (!leadId) return fail(404, 'NOT_FOUND', 'Franchise lead not found');

        const access = await assertLeadAccess(supabaseAdmin, request, leadId, dependencies);
        if (access.response) return access.response;
        if (!access.requester || !access.lead) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        if (!canAccessCompanyScope(access.requester, access.lead.company_id)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied');
        }

        const nowIso = new Date().toISOString();
        const updatePayload: JsonRecord = { updated_at: nowIso };
        const nextTitle = cleanString(body.title);
        const nextDocumentStatus = cleanString(getFirst(body, ['documentStatus', 'document_status']));
        const nextFileUrl = cleanString(getFirst(body, ['fileUrl', 'file_url']));
        const nextFileName = cleanString(getFirst(body, ['fileName', 'file_name']));
        if (nextTitle) updatePayload.title = nextTitle;
        if (nextDocumentStatus) updatePayload.document_status = nextDocumentStatus;
        if (nextFileUrl && cleanString(document.source_type) !== 'upload') updatePayload.file_url = nextFileUrl;
        if (nextFileName) updatePayload.file_name = nextFileName;
        if (Object.prototype.hasOwnProperty.call(body, 'memo')) updatePayload.memo = cleanString(body.memo) || '';
        const storageData = buildLeadDocumentStorageData({
            storageBucket: getFirst(body, ['storageBucket', 'storage_bucket']),
            storagePath: getFirst(body, ['storagePath', 'storage_path'])
        });
        if (storageData) {
            if (!readLeadDocumentScopedStorageTarget({
                source_type: cleanString(document.source_type),
                data: storageData
            }, {
                companyId: access.lead.company_id,
                leadId: access.lead.id
            })) {
                return fail(400, 'VALIDATION_ERROR', 'Invalid document storage path');
            }
            updatePayload.data = storageData;
        }

        const { error: updateError } = await supabaseAdmin
            .from('franchise_lead_documents')
            .update(updatePayload)
            .eq('id', documentId)
            .eq('company_id', access.lead.company_id);
        if (updateError) throw updateError;

        const stepKey = normalizeLeadContractChecklistStepKey(getFirst(body, ['checklistStepKey', 'stepKey', 'step_key']));
        if (stepKey) {
            const { error: linkError } = await supabaseAdmin
                .from('franchise_lead_document_checklist_links')
                .upsert({
                    company_id: access.lead.company_id,
                    lead_id: access.lead.id,
                    lead_document_id: documentId,
                    step_key: stepKey,
                    created_by: access.requester.id,
                    created_at: nowIso
                }, {
                    onConflict: 'lead_document_id,step_key'
                });
            if (linkError) throw linkError;
        }

        return ok(await fetchLeadDocumentState(supabaseAdmin, access.lead.id, access.lead.company_id));
    } catch (error) {
        return handleLeadDocumentError(error, 'PATCH');
    }
}

export async function handleLeadDocumentsDELETE(
    request: Request,
    dependencies: LeadDocumentRouteDependencies = createDefaultRouteDependencies()
) {
    try {
        const supabaseAdmin = dependencies.getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const body = request.headers.get('content-type')?.includes('application/json')
            ? await readBody(request)
            : {};
        const documentId = searchParams.get('id')
            || searchParams.get('documentId')
            || cleanString(getFirst(body, ['id', 'documentId', 'document_id']));
        if (!documentId) return fail(400, 'VALIDATION_ERROR', 'documentId is required');

        const { document, error: documentError } = await fetchDocument(supabaseAdmin, documentId);
        if (documentError || !document) return fail(404, 'NOT_FOUND', 'Document not found');
        const leadId = cleanString(document.lead_id);
        if (!leadId) return fail(404, 'NOT_FOUND', 'Franchise lead not found');

        const access = await assertLeadAccess(supabaseAdmin, request, leadId, dependencies);
        if (access.response) return access.response;
        if (!access.requester || !access.lead) return fail(401, 'AUTH_REQUIRED', 'authenticated session is required');
        if (!canAccessCompanyScope(access.requester, access.lead.company_id)) {
            return fail(403, 'FORBIDDEN', 'Forbidden: cross-company write denied');
        }

        const stepKey = normalizeLeadContractChecklistStepKey(
            searchParams.get('checklistStepKey')
            || searchParams.get('stepKey')
            || searchParams.get('step_key')
            || getFirst(body, ['checklistStepKey', 'stepKey', 'step_key'])
        );
        if (stepKey) {
            const { error: unlinkError } = await supabaseAdmin
                .from('franchise_lead_document_checklist_links')
                .delete()
                .eq('company_id', access.lead.company_id)
                .eq('lead_id', access.lead.id)
                .eq('lead_document_id', documentId)
                .eq('step_key', stepKey);
            if (unlinkError) throw unlinkError;
            return ok(await fetchLeadDocumentState(supabaseAdmin, access.lead.id, access.lead.company_id));
        }

        const storageTarget = readLeadDocumentScopedStorageTarget(document, {
            companyId: access.lead.company_id,
            leadId: access.lead.id
        });

        const { error: deleteError } = await supabaseAdmin
            .from('franchise_lead_documents')
            .delete()
            .eq('id', documentId)
            .eq('company_id', access.lead.company_id);
        if (deleteError) throw deleteError;

        if (storageTarget) {
            const { error: storageError } = await supabaseAdmin.storage
                .from(storageTarget.bucket)
                .remove([storageTarget.path]);
            if (storageError) {
                console.error('Franchise lead document storage cleanup failed:', storageError);
            }
        }

        return ok(await fetchLeadDocumentState(supabaseAdmin, access.lead.id, access.lead.company_id));
    } catch (error) {
        return handleLeadDocumentError(error, 'DELETE');
    }
}

export async function GET(request: Request) {
    return handleLeadDocumentsGET(request);
}

export async function POST(request: Request) {
    return handleLeadDocumentsPOST(request);
}

export async function PATCH(request: Request) {
    return handleLeadDocumentsPATCH(request);
}

export async function DELETE(request: Request) {
    return handleLeadDocumentsDELETE(request);
}
