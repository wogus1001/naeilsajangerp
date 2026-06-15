import React from 'react';
import {
    type DisclosureChannel,
    type DisclosureEligibility,
    type FranchiseDisclosureDocument,
    type FranchiseLeadDisclosureDelivery
} from '@/lib/franchise-disclosure-deliveries';
import {
    buildInitialDraft,
    type DocumentDraft,
    toDateTimeLocalValue
} from './leadDisclosureFormUtils';
import {
    fetchLeadDisclosureWorkflowState,
    recordDisclosureDeliveryRequest,
    saveDisclosureDocumentRequest,
    uploadDisclosureFileRequest
} from './leadDisclosureWorkflowRequests';

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

function buildDefaultDeliveryDocumentTitle(leadName: string, interestedBrand: string): string {
    const brand = interestedBrand.trim();
    return brand ? `${brand} 정보공개서` : `${leadName} 정보공개서`;
}

function buildDefaultDeliveryDocumentVersion(): string {
    return new Date().getFullYear().toString();
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
    const [deliveryDocumentTitle, setDeliveryDocumentTitle] = React.useState(() => buildDefaultDeliveryDocumentTitle(leadName, interestedBrand));
    const [deliveryDocumentVersion, setDeliveryDocumentVersion] = React.useState(() => buildDefaultDeliveryDocumentVersion());
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
            const disclosureState = await fetchLeadDisclosureWorkflowState({
                userId,
                leadId,
                companyId,
                companyName
            });
            const nextDocuments = disclosureState.documents;
            const nextEligibility = disclosureState.eligibility;
            setDocuments(nextDocuments);
            setDeliveries(disclosureState.deliveries);
            setEligibility(nextEligibility);
            onEligibilityChange(nextEligibility);
            setSelectedDocumentId(current => current || nextDocuments[0]?.id || '');
            setDeliveryDocumentTitle(current => current || nextDocuments[0]?.title || buildDefaultDeliveryDocumentTitle(leadName, interestedBrand));
            setDeliveryDocumentVersion(current => current || nextDocuments[0]?.version || buildDefaultDeliveryDocumentVersion());
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
    }, [companyId, companyName, interestedBrand, leadId, leadName, onEligibilityChange, userId]);

    React.useEffect(() => {
        setRecipientContact(leadContact);
        setDraft(buildInitialDraft(leadName, interestedBrand));
        setSelectedDocumentId('');
        setDeliveryDocumentTitle(buildDefaultDeliveryDocumentTitle(leadName, interestedBrand));
        setDeliveryDocumentVersion(buildDefaultDeliveryDocumentVersion());
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
            const upload = await uploadDisclosureFileRequest({
                companyId,
                companyName,
                file
            });
            setDraft(prev => ({ ...prev, fileUrl: upload.publicUrl, fileName: upload.fileName }));
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
            const document = await saveDisclosureDocumentRequest({
                requesterId: userId,
                companyId,
                companyName,
                draft
            });
            setDocuments(prev => [document, ...prev]);
            setSelectedDocumentId(document.id);
            setDraft(buildInitialDraft(leadName, interestedBrand));
            setMessage('정보공개서를 저장했습니다.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '정보공개서 저장에 실패했습니다.');
        } finally {
            setIsSavingDocument(false);
        }
    };

    const recordDelivery = async () => {
        const selectedDocument = documents.find(document => document.id === selectedDocumentId) || null;
        const documentTitle = (selectedDocument?.title || deliveryDocumentTitle).trim();
        const documentVersion = (selectedDocument?.version || deliveryDocumentVersion || buildDefaultDeliveryDocumentVersion()).trim();
        if (!documentTitle) {
            setErrorMessage('정보공개서명을 입력해주세요.');
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
            const data = await recordDisclosureDeliveryRequest({
                requesterId: userId,
                leadId,
                documentId: selectedDocumentId,
                documentTitle,
                documentVersion,
                sentAt: parsedSentAt.toISOString(),
                channel,
                recipientName: leadName,
                recipientContact,
                memo: deliveryMemo
            });
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
        deliveryDocumentTitle,
        deliveryDocumentVersion,
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
        setDeliveryDocumentTitle,
        setDeliveryDocumentVersion,
        setDeliveryMemo,
        setRecipientContact,
        setSelectedDocumentId,
        setSentAt,
        updateDraft,
        uploadDisclosureFile
    };
}
