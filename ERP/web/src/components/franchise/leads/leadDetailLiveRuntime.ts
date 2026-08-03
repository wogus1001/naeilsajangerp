import { buildLeadDocumentStoragePrefix } from '@/lib/franchise-lead-document-storage';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import {
    deleteDisclosureDocumentRequest,
    disconnectGmailRequest,
    fetchGmailConnectionStatus,
    fetchLeadDisclosureWorkflowState,
    requestGmailAuthorizationUrl,
    saveDisclosureDocumentRequest,
    sendDisclosureEmailRequest,
    uploadDisclosureFileRequest
} from '../leadDisclosureWorkflowRequests';
import {
    fetchContractStoreLocation,
    fetchOpeningProject,
    saveOpeningProjectDraft
} from './LeadOpeningProjectSection.utils';
import {
    EMPTY_LEAD_CHECKLIST_SUMMARY,
    type LeadChecklistSnapshot,
    type LeadContractStoreRuntimePort,
    type LeadDetailRuntime,
    type LeadDocumentCreateInput,
    type LeadElectronicContract
} from './leadDetailRuntime';
import type { FranchiseLocation } from './types';

type ChecklistResponse = Partial<LeadChecklistSnapshot>;
type DocumentsResponse = {
    readonly documents?: Awaited<ReturnType<LeadDetailRuntime['documents']['load']>>;
};
type ElectronicContractsResponse = {
    readonly contracts?: readonly LeadElectronicContract[];
};
type LocationResponse = {
    readonly location?: FranchiseLocation | null;
    readonly locations?: readonly FranchiseLocation[];
    readonly created?: boolean;
};
type OpenDocumentResponse = {
    readonly url?: string;
};
type UploadResponse = {
    readonly path?: string;
};

const UPLOAD_BUCKET = 'property-documents';

async function readData<T>(response: Response): Promise<T> {
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<T>(payload);
}

async function loadChecklist(input: {
    readonly leadId: string;
    readonly userId: string;
}): Promise<LeadChecklistSnapshot> {
    const params = new URLSearchParams({ requesterId: input.userId, leadId: input.leadId });
    const response = await fetch(`/api/franchise-lead-contract-checklist?${params.toString()}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const data = await readData<ChecklistResponse>(response);
    return {
        steps: data.steps || [],
        summary: data.summary || EMPTY_LEAD_CHECKLIST_SUMMARY
    };
}

async function saveChecklistStep(
    input: Parameters<LeadDetailRuntime['checklist']['saveStep']>[0]
): Promise<LeadChecklistSnapshot> {
    const response = await fetch('/api/franchise-lead-contract-checklist', {
        method: 'PUT',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
            requesterId: input.userId,
            leadId: input.leadId,
            stepKey: input.stepKey,
            ...input.patch
        })
    });
    const data = await readData<ChecklistResponse>(response);
    return {
        steps: data.steps || [],
        summary: data.summary || EMPTY_LEAD_CHECKLIST_SUMMARY
    };
}

async function loadDocuments(input: {
    readonly leadId: string;
}): ReturnType<LeadDetailRuntime['documents']['load']> {
    const params = new URLSearchParams({ leadId: input.leadId });
    const response = await fetch(`/api/franchise-lead-documents?${params.toString()}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    return (await readData<DocumentsResponse>(response)).documents || [];
}

async function loadElectronicContracts(input: {
    readonly leadId: string;
}): ReturnType<LeadDetailRuntime['documents']['loadElectronicContracts']> {
    const params = new URLSearchParams({ scope: 'company', leadId: input.leadId });
    const response = await fetch(`/api/electronic-contracts?${params.toString()}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const contracts = (await readData<ElectronicContractsResponse>(response)).contracts || [];
    return contracts.filter(contract => contract.status === 'completed');
}

function sanitizePathPart(value: string): string {
    return value
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'document';
}

async function uploadDocument(
    input: Parameters<LeadDetailRuntime['documents']['upload']>[0]
): ReturnType<LeadDetailRuntime['documents']['upload']> {
    const formData = new FormData();
    const suffix = Math.random().toString(36).slice(2, 10) || 'upload';
    const storagePrefix = buildLeadDocumentStoragePrefix(input);
    formData.append('file', input.file);
    formData.append('bucket', UPLOAD_BUCKET);
    formData.append('companyId', input.companyId);
    formData.append('leadId', input.leadId);
    formData.append('path', `${storagePrefix}${Date.now()}-${suffix}-${sanitizePathPart(input.file.name)}`);
    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: await getApiAuthHeaders()
    });
    const path = (await readData<UploadResponse>(response)).path;
    if (!path) throw new Error('업로드 경로를 확인할 수 없습니다.');
    return { storageBucket: UPLOAD_BUCKET, storagePath: path, fileName: input.file.name };
}

async function createDocument(input: LeadDocumentCreateInput) {
    const response = await fetch('/api/franchise-lead-documents', {
        method: 'POST',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(input)
    });
    return (await readData<DocumentsResponse>(response)).documents || [];
}

async function removeDocument(
    input: Parameters<LeadDetailRuntime['documents']['remove']>[0]
) {
    const params = new URLSearchParams({ id: input.documentId });
    if (input.checklistStepKey) params.set('checklistStepKey', input.checklistStepKey);
    const response = await fetch(`/api/franchise-lead-documents?${params.toString()}`, {
        method: 'DELETE',
        headers: await getApiAuthHeaders()
    });
    return (await readData<DocumentsResponse>(response)).documents || [];
}

async function linkDocument(
    input: Parameters<LeadDetailRuntime['documents']['link']>[0]
) {
    const response = await fetch('/api/franchise-lead-documents', {
        method: 'PATCH',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: input.documentId, checklistStepKey: input.checklistStepKey })
    });
    return (await readData<DocumentsResponse>(response)).documents || [];
}

async function openDocument(input: { readonly documentId: string }): Promise<string> {
    const params = new URLSearchParams({ action: 'open', documentId: input.documentId });
    const response = await fetch(`/api/franchise-lead-documents?${params.toString()}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const url = (await readData<OpenDocumentResponse>(response)).url;
    if (!url) throw new Error('문서 열람 URL을 확인하지 못했습니다.');
    return url;
}

const store: LeadContractStoreRuntimePort = {
    load: fetchContractStoreLocation,
    async save(input) {
        const response = await fetch('/api/franchise-locations', {
            method: 'PUT',
            headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                ...input.form,
                id: input.locationId,
                requesterId: input.userId,
                companyName: input.companyName,
                locationType: '가맹점'
            })
        });
        return (await readData<LocationResponse>(response)).location || null;
    },
    async create(input) {
        const response = await fetch('/api/franchise-leads/contract-store', {
            method: 'POST',
            headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                requesterId: input.userId,
                companyName: input.companyName,
                leadId: input.leadId,
                sourceType: input.sourceType,
                sourceId: input.sourceId,
                draft: input.form
            })
        });
        const data = await readData<LocationResponse>(response);
        return { location: data.location || null, created: data.created !== false };
    }
};

export const LIVE_LEAD_DETAIL_RUNTIME: LeadDetailRuntime = {
    disclosure: {
        load: fetchLeadDisclosureWorkflowState,
        upload: uploadDisclosureFileRequest,
        saveDocument: saveDisclosureDocumentRequest,
        deleteDocument: deleteDisclosureDocumentRequest,
        loadGmailStatus: fetchGmailConnectionStatus,
        gmailConnection: { kind: 'popup', requestAuthorizationUrl: requestGmailAuthorizationUrl },
        disconnectGmail: disconnectGmailRequest,
        sendEmail: sendDisclosureEmailRequest
    },
    checklist: { load: loadChecklist, saveStep: saveChecklistStep },
    documents: {
        load: loadDocuments,
        loadElectronicContracts,
        upload: uploadDocument,
        create: createDocument,
        remove: removeDocument,
        link: linkDocument,
        open: openDocument
    },
    store,
    opening: {
        async load(input) {
            const storeLocation = await fetchContractStoreLocation(input);
            const project = storeLocation
                ? await fetchOpeningProject({
                    locationId: storeLocation.id,
                    userId: input.userId,
                    companyName: input.companyName
                })
                : null;
            return { storeLocation, project };
        },
        save: saveOpeningProjectDraft
    }
};
