import React from 'react';
import { getGmailOAuthResultMessage } from './leadDisclosureFormUtils';
import {
    parseGmailOAuthResultMessage,
    type GmailOAuthResultMessage
} from '@/lib/gmail-oauth-flow';
import { useLeadDetailRuntime } from './leads/LeadDetailRuntimeProvider';
import type { GmailConnectionStatus } from './leads/leadDetailRuntime';

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
    const { disclosure } = useLeadDetailRuntime();
    const [candidateName, setCandidateName] = React.useState(leadName);
    const [recipientEmail, setRecipientEmail] = React.useState('');
    const [recipientPhone, setRecipientPhone] = React.useState(leadContact.includes('@') ? '' : leadContact);
    const [gmailStatus, setGmailStatus] = React.useState<GmailConnectionStatus | null>(null);
    const [isSendingEmail, setIsSendingEmail] = React.useState(false);
    const gmailPopupRef = React.useRef<Window | null>(null);

    const refreshGmailStatus = React.useCallback(async () => {
        if (!userId) {
            setGmailStatus(null);
            return;
        }
        const status = await disclosure.loadGmailStatus({ userId, companyName }).catch(() => null);
        setGmailStatus(status);
    }, [companyName, disclosure, userId]);

    React.useEffect(() => {
        setCandidateName(leadName);
        setRecipientEmail(leadContact.includes('@') ? leadContact : '');
        setRecipientPhone(leadContact.includes('@') ? '' : leadContact);
    }, [leadContact, leadId, leadName]);

    React.useEffect(() => {
        void refreshGmailStatus();
    }, [refreshGmailStatus]);

    const applyOAuthResult = React.useCallback(async (result: GmailOAuthResultMessage) => {
        const params = new URLSearchParams({ gmail: result.gmail });
        if (result.email) params.set('email', result.email);
        if (result.reason) params.set('reason', result.reason);
        const oauthMessage = getGmailOAuthResultMessage(params);
        if (!oauthMessage) return;
        if (oauthMessage.type === 'success') {
            await refreshGmailStatus();
            setMessage(oauthMessage.message);
            setErrorMessage('');
            return;
        }
        setMessage('');
        setErrorMessage(oauthMessage.message);
    }, [refreshGmailStatus, setErrorMessage, setMessage]);

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

    React.useEffect(() => {
        const handleOAuthMessage = (event: MessageEvent<unknown>) => {
            if (event.origin !== window.location.origin) return;
            if (gmailPopupRef.current && event.source !== gmailPopupRef.current) return;
            const result = parseGmailOAuthResultMessage(event.data);
            if (!result) return;
            gmailPopupRef.current?.close();
            gmailPopupRef.current = null;
            void applyOAuthResult(result);
        };
        window.addEventListener('message', handleOAuthMessage);
        return () => window.removeEventListener('message', handleOAuthMessage);
    }, [applyOAuthResult]);

    const connectGmail = React.useCallback(async () => {
        if (!userId || typeof window === 'undefined') return;
        setMessage('');
        setErrorMessage('');
        switch (disclosure.gmailConnection.kind) {
            case 'inline':
                try {
                    const status = await disclosure.gmailConnection.connect({ userId, companyName });
                    setGmailStatus(status);
                    setMessage('Gmail 연결을 완료했습니다.');
                } catch (error) {
                    setErrorMessage(error instanceof Error ? error.message : 'Gmail 연결을 시작하지 못했습니다.');
                }
                return;
            case 'popup': {
                const popup = window.open(
                    '',
                    'fcerp-gmail-oauth',
                    'popup=yes,width=560,height=760,resizable=yes,scrollbars=yes'
                );
                if (!popup) {
                    setErrorMessage('Gmail 연결 팝업이 차단되었습니다. 브라우저에서 팝업을 허용한 뒤 다시 시도해주세요.');
                    return;
                }
                gmailPopupRef.current = popup;
                try {
                    const authorizationUrl = await disclosure.gmailConnection.requestAuthorizationUrl({
                        requesterId: userId,
                        companyName,
                        redirectPath: `${window.location.pathname}${window.location.search}`
                    });
                    if (popup.closed) {
                        gmailPopupRef.current = null;
                        setErrorMessage('Gmail 연결 창이 닫혔습니다. 다시 연결해주세요.');
                        return;
                    }
                    popup.location.replace(authorizationUrl);
                    popup.focus();
                } catch (error) {
                    popup.close();
                    gmailPopupRef.current = null;
                    setErrorMessage(error instanceof Error ? error.message : 'Gmail 연결을 시작하지 못했습니다.');
                }
                return;
            }
            default: {
                const unreachable: never = disclosure.gmailConnection;
                throw new TypeError(`Unsupported Gmail connection strategy: ${String(unreachable)}`);
            }
        }
    }, [companyName, disclosure, setErrorMessage, setMessage, userId]);

    const disconnectGmail = async () => {
        setMessage('');
        setErrorMessage('');
        try {
            await disclosure.disconnectGmail({ requesterId: userId, companyName });
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
            await disclosure.sendEmail({
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
