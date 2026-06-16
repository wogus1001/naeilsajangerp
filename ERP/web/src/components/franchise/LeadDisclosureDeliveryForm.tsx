"use client";

import React from 'react';
import { FilePlus2, Link2Off, Mail, Send } from 'lucide-react';
import type { FranchiseDisclosureDocument } from '@/lib/franchise-disclosure-deliveries';
import type { GmailConnectionStatus } from './leadDisclosureWorkflowRequests';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly documents: readonly FranchiseDisclosureDocument[];
    readonly selectedDocumentId: string;
    readonly recipientEmail: string;
    readonly deliveryMemo: string;
    readonly gmailStatus: GmailConnectionStatus | null;
    readonly isLoading: boolean;
    readonly isSendingEmail: boolean;
    readonly onSelectedDocumentChange: (documentId: string) => void;
    readonly onRecipientEmailChange: (email: string) => void;
    readonly onDeliveryMemoChange: (memo: string) => void;
    readonly onConnectGmail: () => void;
    readonly onDisconnectGmail: () => void;
    readonly onOpenDocumentManager: () => void;
    readonly onSendEmail: () => void;
};

export function LeadDisclosureDeliveryForm({
    documents,
    selectedDocumentId,
    recipientEmail,
    deliveryMemo,
    gmailStatus,
    isLoading,
    isSendingEmail,
    onSelectedDocumentChange,
    onRecipientEmailChange,
    onDeliveryMemoChange,
    onConnectGmail,
    onDisconnectGmail,
    onOpenDocumentManager,
    onSendEmail
}: Props) {
    const canSendEmail = Boolean(gmailStatus?.connected && selectedDocumentId && recipientEmail.trim() && !isSendingEmail);

    return (
        <div className={styles.disclosureFormBlock}>
            <div className={styles.disclosureBlockTitle}>
                <strong>Gmail 발송</strong>
                <span>{gmailStatus?.connected ? gmailStatus.connection?.gmailEmail : gmailStatus?.configReady ? '미연결' : '설정 필요'}</span>
            </div>
            {gmailStatus && !gmailStatus.configReady && (
                <div className={`${styles.messageBox} ${styles.messageBoxWarn}`}>
                    Gmail OAuth 설정이 필요합니다. 관리자에게 `GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET`, `GMAIL_TOKEN_ENCRYPTION_KEY` 설정을 요청해주세요.
                </div>
            )}
            <div className={styles.disclosureFormGrid}>
                <label>
                    저장 문서
                    <select value={selectedDocumentId} onChange={(event) => onSelectedDocumentChange(event.currentTarget.value)} disabled={isLoading || documents.length === 0}>
                        <option value="">{documents.length === 0 ? '저장된 문서 없음' : '문서 선택'}</option>
                        {documents.map(document => (
                            <option key={document.id} value={document.id}>{document.title} · {document.version}</option>
                        ))}
                    </select>
                </label>
                <label>
                    수신 이메일
                    <input type="email" value={recipientEmail} onChange={(event) => onRecipientEmailChange(event.currentTarget.value)} />
                </label>
            </div>
            {documents.length === 0 ? (
                <div className={`${styles.messageBox} ${styles.messageBoxWarn}`}>
                    저장된 정보공개서가 없습니다. 문서 관리에서 회사별 정보공개서를 먼저 등록해주세요.
                    <div className={styles.disclosureActionRow}>
                        <button type="button" className={styles.secondaryButton} onClick={onOpenDocumentManager}>
                            <FilePlus2 size={14} />
                            문서 등록
                        </button>
                    </div>
                </div>
            ) : (
                <div className={styles.disclosureActionRow}>
                    <button type="button" className={styles.secondaryButton} onClick={onOpenDocumentManager}>
                        <FilePlus2 size={14} />
                        문서 관리
                    </button>
                </div>
            )}
            <label className={styles.disclosureMemoLabel}>
                발송 메모
                <textarea value={deliveryMemo} onChange={(event) => onDeliveryMemoChange(event.currentTarget.value)} />
            </label>
            <div className={styles.disclosureActionRow}>
                {gmailStatus?.connected ? (
                    <button type="button" className={styles.secondaryButton} onClick={onDisconnectGmail}>
                        <Link2Off size={14} />
                        연결 해제
                    </button>
                ) : (
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={onConnectGmail}
                        disabled={!gmailStatus?.configReady}
                        title={gmailStatus?.configReady ? 'Gmail 계정을 연결합니다.' : 'Gmail OAuth 환경변수 설정이 필요합니다.'}
                    >
                        <Mail size={14} />
                        Gmail 연결
                    </button>
                )}
                <button type="button" className={styles.primaryButton} onClick={onSendEmail} disabled={!canSendEmail}>
                    <Send size={14} />
                    {isSendingEmail ? '발송 중' : 'Gmail 발송'}
                </button>
            </div>
        </div>
    );
}
