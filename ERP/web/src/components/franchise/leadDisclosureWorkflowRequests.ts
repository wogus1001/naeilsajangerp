import {
    type DisclosureChannel,
    type DisclosureEligibility,
    type FranchiseDisclosureDocument,
    type FranchiseLeadDisclosureDelivery
} from '@/lib/franchise-disclosure-deliveries';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import {
    buildDisclosureStoragePath,
    DISCLOSURE_UPLOAD_BUCKET,
    type DocumentDraft
} from './leadDisclosureFormUtils';

export type LeadDisclosureWorkflowState = {
    readonly documents: readonly FranchiseDisclosureDocument[];
    readonly deliveries: readonly FranchiseLeadDisclosureDelivery[];
    readonly eligibility: DisclosureEligibility | null;
};

export type LeadDisclosuresResponse = {
    readonly deliveries?: readonly FranchiseLeadDisclosureDelivery[];
    readonly eligibility?: DisclosureEligibility;
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
    readonly companyId?: string;
    readonly companyName: string;
    readonly file: File;
};

type SaveDisclosureDocumentInput = {
    readonly requesterId: string;
    readonly companyId?: string;
    readonly companyName: string;
    readonly draft: DocumentDraft;
};

type RecordDisclosureDeliveryInput = {
    readonly requesterId: string;
    readonly leadId: string;
    readonly documentId: string;
    readonly documentTitle: string;
    readonly documentVersion: string;
    readonly sentAt: string;
    readonly channel: DisclosureChannel;
    readonly recipientName: string;
    readonly recipientContact: string;
    readonly memo: string;
};

function buildUploadSuffix(): string {
    return Math.random().toString(36).slice(2, 10) || 'upload';
}

export async function fetchLeadDisclosureWorkflowState(input: FetchDisclosureWorkflowStateInput): Promise<LeadDisclosureWorkflowState> {
    const documentParams = new URLSearchParams({ requesterId: input.userId });
    if (input.companyId) documentParams.set('companyId', input.companyId);
    if (input.companyName) documentParams.set('company', input.companyName);
    const deliveryParams = new URLSearchParams({ requesterId: input.userId, leadId: input.leadId });
    const [documentResponse, deliveryResponse] = await Promise.all([
        fetch(`/api/franchise-disclosure-documents?${documentParams.toString()}`, { cache: 'no-store' }),
        fetch(`/api/franchise-lead-disclosures?${deliveryParams.toString()}`, { cache: 'no-store' })
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
    formData.append('path', buildDisclosureStoragePath({
        companyId: input.companyId,
        companyName: input.companyName,
        fileName: input.file.name,
        timestamp: Date.now(),
        uniqueSuffix: buildUploadSuffix()
    }));

    const response = await fetch('/api/upload', { method: 'POST', body: formData });
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
        headers: { 'Content-Type': 'application/json' },
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

export async function recordDisclosureDeliveryRequest(input: RecordDisclosureDeliveryInput): Promise<LeadDisclosuresResponse> {
    const response = await fetch('/api/franchise-lead-disclosures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requesterId: input.requesterId,
            leadId: input.leadId,
            documentId: input.documentId || undefined,
            documentTitle: input.documentTitle,
            documentVersion: input.documentVersion,
            sentAt: input.sentAt,
            channel: input.channel,
            recipientName: input.recipientName,
            recipientContact: input.recipientContact,
            memo: input.memo
        })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(readApiError(payload));
    return unwrapApiData<LeadDisclosuresResponse>(payload);
}
