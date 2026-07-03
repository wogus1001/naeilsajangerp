import React from 'react';
import {
    disconnectGmailRequest,
    fetchGmailConnectionStatus,
    sendDisclosureEmailRequest,
    type GmailConnectionStatus
} from './leadDisclosureWorkflowRequests';
import { getGmailOAuthResultMessage } from './leadDisclosureFormUtils';

type UseLeadDisclosureGmailInput = {
    readonly userId: string;
    readonly companyName: string;
    readonly leadId: string;
    readonly leadName: string;
    readonly leadContact: string;
    readonly selectedDocumentId: string;
    readonly deliveryMemo: string;
    readonly reloadDisclosureState: () => Promise<void>;
    readonly clearDeliveryMemo: () => void;
    readonly setMessage: (message: string) => void;
    readonly setErrorMessage: (message: string) => void;
};

export function useLeadDisclosureGmail({
    userId,
    companyName,
    leadId,
    leadName,
    leadContact,
    selectedDocumentId,
    deliveryMemo,
    reloadDisclosureState,
    clearDeliveryMemo,
    setMessage,
    setErrorMessage
}: UseLeadDisclosureGmailInput) {
    const [candidateName, setCandidateName] = React.useState(leadName);
    const [recipientEmail, setRecipientEmail] = React.useState('');
    const [recipientPhone, setRecipientPhone] = React.useState(leadContact.includes('@') ? '' : leadContact);
    const [gmailStatus, setGmailStatus] = React.useState<GmailConnectionStatus | null>(null);
    const [isSendingEmail, setIsSendingEmail] = React.useState(false);

    const refreshGmailStatus = React.useCallback(async () => {
        if (!userId) {
            setGmailStatus(null);
            return;
        }
        const status = await fetchGmailConnectionStatus({ userId, companyName }).catch(() => null);
        setGmailStatus(status);
    }, [companyName, userId]);

    React.useEffect(() => {
        setCandidateName(leadName);
        setRecipientEmail(leadContact.includes('@') ? leadContact : '');
        setRecipientPhone(leadContact.includes('@') ? '' : leadContact);
    }, [leadContact, leadId, leadName]);

    React.useEffect(() => {
        void refreshGmailStatus();
    }, [refreshGmailStatus]);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const oauthMessage = getGmailOAuthResultMessage(new URLSearchParams(window.location.search));
        if (!oauthMessage) return;
        if (oauthMessage.type === 'success') {
            setMessage(oauthMessage.message);
            setErrorMessage('');
            return;
        }
        setMessage('');
        setErrorMessage(oauthMessage.message);
    }, [setErrorMessage, setMessage]);

    const connectGmail = React.useCallback(() => {
        if (!userId || typeof window === 'undefined') return;
        const params = new URLSearchParams({
            requesterId: userId,
            redirect: `${window.location.pathname}${window.location.search}`
        });
        if (companyName) params.set('company', companyName);
        window.location.href = `/api/integrations/gmail/connect?${params.toString()}`;
    }, [companyName, userId]);

    const disconnectGmail = async () => {
        setMessage('');
        setErrorMessage('');
        try {
            await disconnectGmailRequest({ requesterId: userId, companyName });
            await refreshGmailStatus();
            setMessage('Gmail 연결을 해제했습니다.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Gmail 연결 해제에 실패했습니다.');
        }
    };

    const sendDisclosureEmail = async () => {
        if (!selectedDocumentId) {
            setErrorMessage('발송할 저장 문서를 선택해주세요.');
            return;
        }
        if (!recipientEmail.trim()) {
            setErrorMessage('수신 이메일을 입력해주세요.');
            return;
        }
        if (!candidateName.trim()) {
            setErrorMessage('알림톡 변수와 발송 이력에 사용할 후보자명을 입력해주세요.');
            return;
        }
        setIsSendingEmail(true);
        setMessage('');
        setErrorMessage('');
        try {
            await sendDisclosureEmailRequest({
                requesterId: userId,
                leadId,
                documentId: selectedDocumentId,
                recipientName: candidateName,
                recipientEmail,
                recipientPhone,
                memo: deliveryMemo
            });
            await reloadDisclosureState();
            clearDeliveryMemo();
            setMessage('정보공개서를 Gmail로 발송했습니다.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Gmail 발송에 실패했습니다.');
        } finally {
            setIsSendingEmail(false);
        }
    };

    return {
        connectGmail,
        disconnectGmail,
        gmailStatus,
        isSendingEmail,
        candidateName,
        recipientEmail,
        recipientPhone,
        sendDisclosureEmail,
        setCandidateName,
        setRecipientEmail,
        setRecipientPhone
    };
}
