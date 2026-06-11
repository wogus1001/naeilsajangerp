import React from 'react';
import {
    type DisclosureChannel,
    type DisclosureEligibility,
    type FranchiseDisclosureDocument,
    type FranchiseLeadDisclosureDelivery
} from '@/lib/franchise-disclosure-deliveries';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import {
    buildDisclosureStoragePath,
    buildInitialDraft,
    DISCLOSURE_UPLOAD_BUCKET,
    type DocumentDraft,
    toDateTimeLocalValue
} from './leadDisclosureFormUtils';

type UseLeadDisclosureWorkflowInput = {
    readonly leadId: string;
    readonly userId: string;
    readonly companyId?: string;
    readonly companyName: string;
    readonly leadName: string;
    readonly leadContact: string;
    readonly interestedBrand: string;
    readonly onEligibilityChange: (eligibility: DisclosureEligibility | null) => void;
};

type DisclosureDocumentsResponse = {
    readonly documents?: readonly FranchiseDisclosureDocument[];
};

type LeadDisclosuresResponse = {
    readonly deliveries?: readonly FranchiseLeadDisclosureDelivery[];
    readonly eligibility?: DisclosureEligibility;
};

type DisclosureUploadResponse = {
    readonly publicUrl?: string;
};

function buildUploadSuffix(): string {
    return Math.random().toString(36).slice(2, 10) || 'upload';
}

export function useLeadDisclosureWorkflow({
    leadId,
    userId,
    companyId,
    companyName,
    leadName,
    leadContact,
    interestedBrand,
    onEligibilityChange
}: UseLeadDisclosureWorkflowInput) {
    const [documents, setDocuments] = React.useState<readonly FranchiseDisclosureDocument[]>([]);
    const [deliveries, setDeliveries] = React.useState<readonly FranchiseLeadDisclosureDelivery[]>([]);
    const [eligibility, setEligibility] = React.useState<DisclosureEligibility | null>(null);
    const [selectedDocumentId, setSelectedDocumentId] = React.useState('');
    const [sentAt, setSentAt] = React.useState(() => toDateTimeLocalValue(new Date()));
    const [channel, setChannel] = React.useState<DisclosureChannel>('manual');
    const [recipientContact, setRecipientContact] = React.useState(leadContact);
    const [deliveryMemo, setDeliveryMemo] = React.useState('');
    const [draft, setDraft] = React.useState<DocumentDraft>(() => buildInitialDraft(leadName, interestedBrand));
    const [message, setMessage] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSavingDocument, setIsSavingDocument] = React.useState(false);
    const [isUploadingDocument, setIsUploadingDocument] = React.useState(false);
    const [isRecordingDelivery, setIsRecordingDelivery] = React.useState(false);

    const fetchDisclosureState = React.useCallback(async () => {
        if (!userId || !leadId) return;
        setIsLoading(true);
        setErrorMessage('');
        try {
            const documentParams = new URLSearchParams({ requesterId: userId });
            if (companyId) documentParams.set('companyId', companyId);
            if (companyName) documentParams.set('company', companyName);
            const deliveryParams = new URLSearchParams({ requesterId: userId, leadId });
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
            const nextDocuments = documentData.documents || [];
            const nextEligibility = deliveryData.eligibility || null;
            setDocuments(nextDocuments);
            setDeliveries(deliveryData.deliveries || []);
            setEligibility(nextEligibility);
            onEligibilityChange(nextEligibility);
            setSelectedDocumentId(current => current || nextDocuments[0]?.id || '');
        } catch (error) {
            const messageText = error instanceof Error ? error.message : '정보공개서 상태를 불러오지 못했습니다.';
            setErrorMessage(messageText);
            setDocuments([]);
            setDeliveries([]);
            setEligibility(null);
            onEligibilityChange(null);
        } finally {
            setIsLoading(false);
        }
    }, [companyId, companyName, leadId, onEligibilityChange, userId]);

    React.useEffect(() => {
        setRecipientContact(leadContact);
        setDraft(buildInitialDraft(leadName, interestedBrand));
        setSelectedDocumentId('');
        setMessage('');
        setErrorMessage('');
        setSentAt(toDateTimeLocalValue(new Date()));
    }, [leadContact, leadId, leadName, interestedBrand]);

    React.useEffect(() => {
        void fetchDisclosureState();
    }, [fetchDisclosureState]);

    const updateDraft = React.useCallback((patch: Partial<DocumentDraft>) => {
        setDraft(prev => ({ ...prev, ...patch }));
    }, []);

    const uploadDisclosureFile = async (file: File | null) => {
        if (!file) return;
        setIsUploadingDocument(true);
        setMessage('');
        setErrorMessage('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', DISCLOSURE_UPLOAD_BUCKET);
            formData.append('path', buildDisclosureStoragePath({
                companyId,
                companyName,
                fileName: file.name,
                timestamp: Date.now(),
                uniqueSuffix: buildUploadSuffix()
            }));

            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<DisclosureUploadResponse>(payload);
            const publicUrl = data.publicUrl;
            if (!publicUrl) throw new Error('정보공개서 업로드 URL을 확인할 수 없습니다.');
            setDraft(prev => ({ ...prev, fileUrl: publicUrl, fileName: file.name }));
            setMessage('정보공개서 파일을 업로드했습니다.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '정보공개서 파일 업로드에 실패했습니다.');
        } finally {
            setIsUploadingDocument(false);
        }
    };

    const saveDocument = async () => {
        if (!draft.title.trim()) {
            setErrorMessage('문서명을 입력해주세요.');
            return;
        }
        if (!draft.fileUrl.trim()) {
            setErrorMessage('정보공개서 파일을 업로드해주세요.');
            return;
        }
        setIsSavingDocument(true);
        setMessage('');
        setErrorMessage('');
        try {
            const response = await fetch('/api/franchise-disclosure-documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterId: userId, companyId, companyName, ...draft })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<{ readonly document: FranchiseDisclosureDocument }>(payload);
            setDocuments(prev => [data.document, ...prev]);
            setSelectedDocumentId(data.document.id);
            setDraft(buildInitialDraft(leadName, interestedBrand));
            setMessage('정보공개서를 저장했습니다.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '정보공개서 저장에 실패했습니다.');
        } finally {
            setIsSavingDocument(false);
        }
    };

    const recordDelivery = async () => {
        if (!selectedDocumentId) {
            setErrorMessage('발송할 정보공개서를 선택해주세요.');
            return;
        }
        const parsedSentAt = new Date(sentAt);
        if (Number.isNaN(parsedSentAt.getTime())) {
            setErrorMessage('발송일시가 올바르지 않습니다.');
            return;
        }

        setIsRecordingDelivery(true);
        setMessage('');
        setErrorMessage('');
        try {
            const response = await fetch('/api/franchise-lead-disclosures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    leadId,
                    documentId: selectedDocumentId,
                    sentAt: parsedSentAt.toISOString(),
                    channel,
                    recipientName: leadName,
                    recipientContact,
                    memo: deliveryMemo
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<LeadDisclosuresResponse>(payload);
            const nextEligibility = data.eligibility || null;
            setDeliveries(data.deliveries || []);
            setEligibility(nextEligibility);
            onEligibilityChange(nextEligibility);
            setDeliveryMemo('');
            setMessage('정보공개서 발송 이력을 저장했습니다.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '발송 이력 저장에 실패했습니다.');
        } finally {
            setIsRecordingDelivery(false);
        }
    };

    return {
        channel,
        deliveryMemo,
        deliveries,
        documents,
        draft,
        eligibility,
        errorMessage,
        isLoading,
        isRecordingDelivery,
        isSavingDocument,
        isUploadingDocument,
        message,
        recipientContact,
        recordDelivery,
        saveDocument,
        selectedDocument: documents.find(document => document.id === selectedDocumentId) || null,
        selectedDocumentId,
        sentAt,
        setChannel,
        setDeliveryMemo,
        setRecipientContact,
        setSelectedDocumentId,
        setSentAt,
        updateDraft,
        uploadDisclosureFile
    };
}
