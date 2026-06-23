import type { SupabaseClient } from '@supabase/supabase-js';
import {
    normalizeLeadContractChecklistStepKey,
    type LeadContractChecklistDocumentSummary
} from './franchise-lead-contract-checklist';

export const FRANCHISE_LEAD_DOCUMENT_SOURCE_TYPES = [
    'upload',
    'external_url',
    'electronic_contract',
    'disclosure',
    'manual'
] as const;

export const ELECTRONIC_CONTRACT_CHECKLIST_STEP_KEY = 'franchise-contract';

export type FranchiseLeadDocumentSourceType = typeof FRANCHISE_LEAD_DOCUMENT_SOURCE_TYPES[number];

export type FranchiseLeadDocumentInput = {
    readonly id?: unknown;
    readonly companyId?: unknown;
    readonly company_id?: unknown;
    readonly leadId?: unknown;
    readonly lead_id?: unknown;
    readonly sourceType?: unknown;
    readonly source_type?: unknown;
    readonly sourceId?: unknown;
    readonly source_id?: unknown;
    readonly title?: unknown;
    readonly documentStatus?: unknown;
    readonly document_status?: unknown;
    readonly fileUrl?: unknown;
    readonly file_url?: unknown;
    readonly fileName?: unknown;
    readonly file_name?: unknown;
    readonly memo?: unknown;
    readonly status?: unknown;
    readonly createdBy?: unknown;
    readonly created_by?: unknown;
    readonly createdAt?: unknown;
    readonly created_at?: unknown;
    readonly updatedAt?: unknown;
    readonly updated_at?: unknown;
    readonly data?: unknown;
    readonly checklistStepKeys?: readonly string[];
};

export type FranchiseLeadDocumentChecklistLinkInput = {
    readonly id?: unknown;
    readonly companyId?: unknown;
    readonly company_id?: unknown;
    readonly leadId?: unknown;
    readonly lead_id?: unknown;
    readonly leadDocumentId?: unknown;
    readonly lead_document_id?: unknown;
    readonly stepKey?: unknown;
    readonly step_key?: unknown;
    readonly createdAt?: unknown;
    readonly created_at?: unknown;
};

export type FranchiseLeadDocument = {
    readonly id: string;
    readonly companyId: string;
    readonly leadId: string;
    readonly sourceType: FranchiseLeadDocumentSourceType;
    readonly sourceId: string;
    readonly title: string;
    readonly documentStatus: string;
    readonly fileUrl: string;
    readonly fileName: string;
    readonly memo: string;
    readonly status: string;
    readonly createdBy: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly checklistStepKeys: readonly string[];
};

export type FranchiseLeadDocumentChecklistLink = {
    readonly id: string;
    readonly companyId: string;
    readonly leadId: string;
    readonly leadDocumentId: string;
    readonly stepKey: string;
    readonly createdAt: string;
};

export type UpsertElectronicContractLeadDocumentInput = {
    readonly companyId: string;
    readonly leadId: string;
    readonly contractId: string;
    readonly checklistStepKey?: string;
    readonly title: string;
    readonly documentStatus: string;
    readonly requesterId: string;
    readonly nowIso?: string;
};

function cleanString(value: unknown): string {
    return String(value ?? '').trim();
}

function cleanDateString(value: unknown): string {
    const raw = cleanString(value);
    if (!raw) return '';
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

export function normalizeFranchiseLeadDocumentSourceType(value: unknown): FranchiseLeadDocumentSourceType {
    const raw = cleanString(value);
    switch (raw) {
        case 'upload':
        case 'external_url':
        case 'electronic_contract':
        case 'disclosure':
        case 'manual':
            return raw;
        default:
            return 'manual';
    }
}

export function toFranchiseLeadDocumentView(
    row: FranchiseLeadDocumentInput,
    checklistStepKeys: readonly string[] = row.checklistStepKeys || []
): FranchiseLeadDocument {
    return {
        id: cleanString(row.id),
        companyId: cleanString(row.companyId ?? row.company_id),
        leadId: cleanString(row.leadId ?? row.lead_id),
        sourceType: normalizeFranchiseLeadDocumentSourceType(row.sourceType ?? row.source_type),
        sourceId: cleanString(row.sourceId ?? row.source_id),
        title: cleanString(row.title) || '점주 문서',
        documentStatus: cleanString(row.documentStatus ?? row.document_status) || 'stored',
        fileUrl: cleanString(row.fileUrl ?? row.file_url),
        fileName: cleanString(row.fileName ?? row.file_name),
        memo: cleanString(row.memo),
        status: cleanString(row.status) || 'active',
        createdBy: cleanString(row.createdBy ?? row.created_by),
        createdAt: cleanDateString(row.createdAt ?? row.created_at),
        updatedAt: cleanDateString(row.updatedAt ?? row.updated_at),
        checklistStepKeys
    };
}

export function toFranchiseLeadDocumentChecklistLinkView(
    row: FranchiseLeadDocumentChecklistLinkInput
): FranchiseLeadDocumentChecklistLink {
    return {
        id: cleanString(row.id),
        companyId: cleanString(row.companyId ?? row.company_id),
        leadId: cleanString(row.leadId ?? row.lead_id),
        leadDocumentId: cleanString(row.leadDocumentId ?? row.lead_document_id),
        stepKey: cleanString(row.stepKey ?? row.step_key),
        createdAt: cleanDateString(row.createdAt ?? row.created_at)
    };
}

export function attachChecklistLinksToDocuments(
    documents: readonly FranchiseLeadDocumentInput[],
    links: readonly FranchiseLeadDocumentChecklistLinkInput[]
): readonly FranchiseLeadDocument[] {
    const stepKeysByDocumentId = new Map<string, string[]>();
    links.forEach(row => {
        const link = toFranchiseLeadDocumentChecklistLinkView(row);
        if (!link.leadDocumentId || !link.stepKey) return;
        const stepKeys = stepKeysByDocumentId.get(link.leadDocumentId) || [];
        stepKeys.push(link.stepKey);
        stepKeysByDocumentId.set(link.leadDocumentId, stepKeys);
    });

    return documents.map(row => {
        const id = cleanString(row.id);
        return toFranchiseLeadDocumentView(row, stepKeysByDocumentId.get(id) || []);
    });
}

export function buildChecklistDocumentSummaries(
    documents: readonly FranchiseLeadDocumentInput[],
    links: readonly FranchiseLeadDocumentChecklistLinkInput[]
): Record<string, LeadContractChecklistDocumentSummary> {
    const documentsById = new Map<string, FranchiseLeadDocument>();
    attachChecklistLinksToDocuments(documents, links).forEach(document => {
        if (document.id && document.status !== 'archived') documentsById.set(document.id, document);
    });

    const summaries = new Map<string, LeadContractChecklistDocumentSummary>();
    links.forEach(row => {
        const link = toFranchiseLeadDocumentChecklistLinkView(row);
        const document = documentsById.get(link.leadDocumentId);
        if (!document || !link.stepKey) return;
        const previous = summaries.get(link.stepKey);
        const documentIds = previous ? [...previous.documentIds, document.id] : [document.id];
        summaries.set(link.stepKey, {
            count: documentIds.length,
            latestTitle: document.title,
            latestStatus: document.documentStatus,
            requiredEvidenceLinked: documentIds.length > 0,
            documentIds
        });
    });

    return Object.fromEntries(summaries);
}

export async function upsertElectronicContractLeadDocument(
    supabaseAdmin: SupabaseClient,
    input: UpsertElectronicContractLeadDocumentInput
): Promise<FranchiseLeadDocument | null> {
    if (!input.leadId || !input.contractId || !input.companyId) return null;

    const nowIso = input.nowIso || new Date().toISOString();
    const checklistStepKey = normalizeLeadContractChecklistStepKey(input.checklistStepKey)
        || ELECTRONIC_CONTRACT_CHECKLIST_STEP_KEY;
    const { data: documentData, error: documentError } = await supabaseAdmin
        .from('franchise_lead_documents')
        .upsert({
            company_id: input.companyId,
            lead_id: input.leadId,
            source_type: 'electronic_contract',
            source_id: input.contractId,
            title: input.title || '전자계약',
            document_status: input.documentStatus || 'draft',
            status: 'active',
            created_by: input.requesterId,
            updated_at: nowIso
        }, {
            onConflict: 'company_id,lead_id,source_type,source_id'
        })
        .select('*')
        .single();

    if (documentError) throw documentError;
    const document = toFranchiseLeadDocumentView(documentData);

    const { error: linkError } = await supabaseAdmin
        .from('franchise_lead_document_checklist_links')
        .upsert({
            company_id: input.companyId,
            lead_id: input.leadId,
            lead_document_id: document.id,
            step_key: checklistStepKey,
            created_by: input.requesterId,
            created_at: nowIso
        }, {
            onConflict: 'lead_document_id,step_key'
        });
    if (linkError) throw linkError;

    return {
        ...document,
        checklistStepKeys: [checklistStepKey]
    };
}
