import React from 'react';
import type { DisclosureEligibility, FranchiseDisclosureDocument, FranchiseLeadDisclosureDelivery } from '@/lib/franchise-disclosure-deliveries';
import {
    buildInitialDraft,
    type DocumentDraft
} from './leadDisclosureFormUtils';
import {
    deleteDisclosureDocumentRequest,
    fetchLeadDisclosureWorkflowState,
    saveDisclosureDocumentRequest,
    uploadDisclosureFileRequest
} from './leadDisclosureWorkflowRequests';
import { useLeadDisclosureGmail } from './useLeadDisclosureGmail';

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
    const [deliveryMemo, setDeliveryMemo] = React.useState('');
    const [draft, setDraft] = React.useState<DocumentDraft>(() => buildInitialDraft(leadName, interestedBrand));
    const [message, setMessage] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSavingDocument, setIsSavingDocument] = React.useState(false);
    const [isUploadingDocument, setIsUploadingDocument] = React.useState(false);
    const [deletingDocumentId, setDeletingDocumentId] = React.useState('');

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
        setDraft(buildInitialDraft(leadName, interestedBrand));
        setSelectedDocumentId('');
        setMessage('');
        setErrorMessage('');
    }, [leadId, leadName, interestedBrand]);

    React.useEffect(() => {
        void fetchDisclosureState();
    }, [fetchDisclosureState]);

    const updateDraft = React.useCallback((patch: Partial<DocumentDraft>) => {
        setDraft(prev => ({ ...prev, ...patch }));
    }, []);

    const selectDocument = React.useCallback((documentId: string) => {
        setSelectedDocumentId(documentId);
    }, []);

    const gmail = useLeadDisclosureGmail({
        userId,
        companyName,
        leadId,
        leadContact,
        selectedDocumentId,
        deliveryMemo,
        reloadDisclosureState: fetchDisclosureState,
        clearDeliveryMemo: () => setDeliveryMemo(''),
        setMessage,
        setErrorMessage
    });

    const uploadDisclosureFile = async (file: File | null) => {
        if (!file) return;
        if (!companyId) {
            setErrorMessage('회사 정보를 확인할 수 없습니다.');
            return;
        }
        setIsUploadingDocument(true);
        setMessage('');
        setErrorMessage('');
        try {
            const upload = await uploadDisclosureFileRequest({
                companyId,
                companyName,
                file,
                requesterId: userId
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

    const deleteDocument = async (documentId: string) => {
        if (!documentId) return;
        setDeletingDocumentId(documentId);
        setMessage('');
        setErrorMessage('');
        try {
            await deleteDisclosureDocumentRequest({
                requesterId: userId,
                documentId
            });
            const nextDocuments = documents.filter(document => document.id !== documentId);
            setDocuments(nextDocuments);
            setSelectedDocumentId(current => current === documentId ? nextDocuments[0]?.id || '' : current);
            setMessage('정보공개서를 삭제했습니다.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '정보공개서 삭제에 실패했습니다.');
        } finally {
            setDeletingDocumentId('');
        }
    };

    return {
        deletingDocumentId,
        deleteDocument,
        deliveryMemo,
        deliveries,
        documents,
        draft,
        eligibility,
        errorMessage,
        gmailStatus: gmail.gmailStatus,
        isLoading,
        isSavingDocument,
        isSendingEmail: gmail.isSendingEmail,
        isUploadingDocument,
        message,
        recipientEmail: gmail.recipientEmail,
        connectGmail: gmail.connectGmail,
        disconnectGmail: gmail.disconnectGmail,
        saveDocument,
        sendDisclosureEmail: gmail.sendDisclosureEmail,
        selectedDocument: documents.find(document => document.id === selectedDocumentId) || null,
        selectedDocumentId,
        selectDocument,
        setDeliveryMemo,
        setRecipientEmail: gmail.setRecipientEmail,
        setSelectedDocumentId,
        updateDraft,
        uploadDisclosureFile
    };
}
