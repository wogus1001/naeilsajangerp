import type {
    DisclosureEligibility,
    FranchiseDisclosureDocument,
    FranchiseLeadDisclosureDelivery
} from '@/lib/franchise-disclosure-deliveries';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import {
    buildDisclosureStoragePath,
    DISCLOSURE_UPLOAD_BUCKET,
    type DocumentDraft
} from './leadDisclosureFormUtils';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';

export type LeadDisclosureWorkflowState = {
    readonly documents: readonly FranchiseDisclosureDocument[];
    readonly deliveries: readonly FranchiseLeadDisclosureDelivery[];
    readonly eligibility: DisclosureEligibility | null;
};

export type LeadDisclosuresResponse = {
    readonly deliveries?: readonly FranchiseLeadDisclosureDelivery[];
    readonly eligibility?: DisclosureEligibility;
};

export type GmailConnectionStatus = {
    readonly configReady: boolean;
    readonly connected: boolean;
    readonly connection: {
        readonly id: string;
        readonly gmailEmail: string;
    } | null;
};

type DisclosureDocumentsResponse = {
    readonly documents?: readonly FranchiseDisclosureDocument[];
};

type DisclosureUploadResponse = {
    readonly publicUrl?: string;
};

type FetchDisclosureWorkflowStateInput = {
    readonly userId: string;
    readonly leadId: string;
    readonly companyId?: string;
    readonly companyName: string;
};

type UploadDisclosureFileInput = {
    readonly companyId: string;
    readonly companyName: string;
    readonly file: File;
    readonly requesterId: string;
};

type SaveDisclosureDocumentInput = {
    readonly requesterId: string;
    readonly companyId?: string;
    readonly companyName: string;
    readonly draft: DocumentDraft;
};

type SendDisclosureEmailInput = {
    readonly requesterId: string;
    readonly leadId: string;
    readonly documentId: string;
    readonly recipientName: string;
    readonly recipientEmail: string;
    readonly recipientPhone: string;
    readonly memo: string;
};

type DeleteDisclosureDocumentInput = {
    readonly requesterId: string;
    readonly documentId: string;
};

type RequestGmailAuthorizationUrlInput = {
    readonly requesterId: string;
    readonly companyName: string;
    readonly redirectPath: string;
};

function buildUploadSuffix(): string {
    return Math.random().toString(36).slice(2, 10) || 'upload';
}

export async function fetchLeadDisclosureWorkflowState(input: FetchDisclosureWorkflowStateInput): Promise<LeadDisclosureWorkflowState> {
    const documentParams = new URLSearchParams({ requesterId: input.userId });
    if (input.companyId) documentParams.set('companyId', input.companyId);
    if (input.companyName) documentParams.set('company', input.companyName);
    const deliveryParams = new URLSearchParams({ requesterId: input.userId, leadId: input.leadId });
    const headers = await getApiAuthHeaders();
    const [documentResponse, deliveryResponse] = await Promise.all([
        fetch(`/api/franchise-disclosure-documents?${documentParams.toString()}`, { cache: 'no-store', headers }),
        fetch(`/api/franchise-lead-disclosures?${deliveryParams.toString()}`, { cache: 'no-store', headers })
    ]);
    const documentPayload = await documentResponse.json();
    const deliveryPayload = await deliveryResponse.json();
    if (!documentResponse.ok) throw new Error(readApiError(documentPayload));
    if (!deliveryResponse.ok) throw new Error(readApiError(deliveryPayload));

    const documentData = unwrapApiData<DisclosureDocumentsResponse>(documentPayload);
    const deliveryData = unwrapApiData<LeadDisclosuresResponse>(deliveryPayload);
    return {
        documents: documentData.documents || [],
        deliveries: deliveryData.deliveries || [],
        eligibility: deliveryData.eligibility || null
    };
}

export async function uploadDisclosureFileRequest(input: UploadDisclosureFileInput): Promise<{ readonly publicUrl: string; readonly fileName: string }> {
    const formData = new FormData();
    formData.append('file', input.file);
    formData.append('bucket', DISCLOSURE_UPLOAD_BUCKET);
    if (input.companyId) formData.append('companyId', input.companyId);
    formData.append('path', buildDisclosureStoragePath({
        companyId: input.companyId,
        companyName: input.companyName,
        fileName: input.file.name,
        timestamp: Date.now(),
        uniqueSuffix: buildUploadSuffix()
    }));

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: await getApiAuthHeaders()
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    const data = unwrapApiData<DisclosureUploadResponse>(payload);
    const publicUrl = data.publicUrl;
    if (!publicUrl) throw new Error('정보공개서 업로드 URL을 확인할 수 없습니다.');
    return { publicUrl, fileName: input.file.name };
}

export async function saveDisclosureDocumentRequest(input: SaveDisclosureDocumentInput): Promise<FranchiseDisclosureDocument> {
    const response = await fetch('/api/franchise-disclosure-documents', {
        method: 'POST',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
            requesterId: input.requesterId,
            companyId: input.companyId,
            companyName: input.companyName,
            ...input.draft
        })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    const data = unwrapApiData<{ readonly document: FranchiseDisclosureDocument }>(payload);
    return data.document;
}

export async function deleteDisclosureDocumentRequest(input: DeleteDisclosureDocumentInput): Promise<void> {
    const params = new URLSearchParams({
        id: input.documentId,
        requesterId: input.requesterId
    });
    const response = await fetch(`/api/franchise-disclosure-documents?${params.toString()}`, {
        method: 'DELETE',
        headers: await getApiAuthHeaders()
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
}

export async function fetchGmailConnectionStatus(input: {
    readonly userId: string;
    readonly companyName: string;
}): Promise<GmailConnectionStatus> {
    const params = new URLSearchParams({ requesterId: input.userId });
    if (input.companyName) params.set('company', input.companyName);
    const response = await fetch(`/api/integrations/gmail/status?${params.toString()}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders()
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<GmailConnectionStatus>(payload);
}

export async function requestGmailAuthorizationUrl(input: RequestGmailAuthorizationUrlInput): Promise<string> {
    const params = new URLSearchParams({
        requesterId: input.requesterId,
        redirect: input.redirectPath,
        response: 'json'
    });
    if (input.companyName) params.set('company', input.companyName);

    const response = await fetch(`/api/integrations/gmail/connect?${params.toString()}`, {
        cache: 'no-store',
        headers: await getApiAuthHeaders({ Accept: 'application/json' })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));

    const data = unwrapApiData<{ readonly authorizationUrl?: string }>(payload);
    if (!data.authorizationUrl) throw new Error('Gmail 연결 주소를 받지 못했습니다.');
    return data.authorizationUrl;
}

export async function disconnectGmailRequest(input: {
    readonly requesterId: string;
    readonly companyName: string;
}): Promise<void> {
    const response = await fetch('/api/integrations/gmail/disconnect', {
        method: 'POST',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
            requesterId: input.requesterId,
            companyName: input.companyName
        })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
}

export async function sendDisclosureEmailRequest(input: SendDisclosureEmailInput): Promise<void> {
    const response = await fetch('/api/franchise-lead-disclosures/send-email', {
        method: 'POST',
        headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
            requesterId: input.requesterId,
            leadId: input.leadId,
            documentId: input.documentId,
            recipientName: input.recipientName,
            recipientEmail: input.recipientEmail,
            recipientPhone: input.recipientPhone,
            memo: input.memo
        })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
}
