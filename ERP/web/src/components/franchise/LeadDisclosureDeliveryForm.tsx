"use client";

import React from 'react';
import { FilePlus2, Link2Off, Mail, Send } from 'lucide-react';
import type { FranchiseDisclosureDocument } from '@/lib/franchise-disclosure-deliveries';
import type { GmailConnectionStatus } from './leadDisclosureWorkflowRequests';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly documents: readonly FranchiseDisclosureDocument[];
    readonly selectedDocumentId: string;
    readonly candidateName: string;
    readonly brandFallbackName: string;
    readonly recipientEmail: string;
    readonly recipientPhone: string;
    readonly deliveryMemo: string;
    readonly gmailStatus: GmailConnectionStatus | null;
    readonly isLoading: boolean;
    readonly isSendingEmail: boolean;
    readonly onSelectedDocumentChange: (documentId: string) => void;
    readonly onCandidateNameChange: (name: string) => void;
    readonly onRecipientEmailChange: (email: string) => void;
    readonly onRecipientPhoneChange: (phone: string) => void;
    readonly onDeliveryMemoChange: (memo: string) => void;
    readonly onConnectGmail: () => void;
    readonly onDisconnectGmail: () => void;
    readonly onOpenDocumentManager: () => void;
    readonly onSendEmail: () => void;
};

export function LeadDisclosureDeliveryForm({
    documents,
    selectedDocumentId,
    candidateName,
    brandFallbackName,
    recipientEmail,
    recipientPhone,
    deliveryMemo,
    gmailStatus,
    isLoading,
    isSendingEmail,
    onSelectedDocumentChange,
    onCandidateNameChange,
    onRecipientEmailChange,
    onRecipientPhoneChange,
    onDeliveryMemoChange,
    onConnectGmail,
    onDisconnectGmail,
    onOpenDocumentManager,
    onSendEmail
}: Props) {
    const selectedDocument = documents.find(document => document.id === selectedDocumentId);
    const previewCandidateName = candidateName.trim() || '후보자명';
    const previewBrandName = selectedDocument?.brandName || brandFallbackName || '브랜드명';
    const previewRecipientPhone = recipientPhone.trim() || '고객번호 미입력';
    const canSendEmail = Boolean(gmailStatus?.connected && selectedDocumentId && candidateName.trim() && recipientEmail.trim() && !isSendingEmail);

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
                    <span className={styles.disclosureLabelText}>
                        후보자명 <span className={styles.requiredMark}>필수</span>
                    </span>
                    <input
                        type="text"
                        value={candidateName}
                        onChange={(event) => onCandidateNameChange(event.currentTarget.value)}
                        placeholder="예: 김민수"
                    />
                </label>
                <label>
                    수신 이메일
                    <input type="email" value={recipientEmail} onChange={(event) => onRecipientEmailChange(event.currentTarget.value)} />
                </label>
                <label>
                    고객번호
                    <input
                        type="tel"
                        value={recipientPhone}
                        onChange={(event) => onRecipientPhoneChange(event.currentTarget.value)}
                        placeholder="예: 010-1234-5678"
                    />
                </label>
            </div>
            <div className={styles.disclosureAlimtalkPreview}>
                <div className={styles.disclosureAlimtalkPreviewHeader}>
                    <strong>정보공개서 확인 안내 알림톡 미리보기</strong>
                    <span>발송 성공 후 후보자 휴대폰으로 전송</span>
                </div>
                <div className={styles.disclosureAlimtalkMock}>
                    <span className={styles.disclosureAlimtalkNotice}>알림톡 도착</span>
                    <div className={styles.disclosureAlimtalkBubble}>
                        <strong>[FC ERP] 정보공개서 확인 안내</strong>
                        <p>
                            {previewCandidateName}님, {previewBrandName} 정보공개서가 이메일로 발송되었습니다.
                        </p>
                        <p>
                            가맹계약 전 필수 확인 문서이므로 이메일을 확인해 주세요.
                        </p>
                        <p>
                            문서 확인 후에는 숙고기간 산정을 위해 반드시 수령 확인하기 버튼을 눌러 주세요.
                        </p>
                        <p>
                            가맹사업법에 따라 정보공개서 제공일로부터 14일이 지난 뒤 가맹계약을 진행할 수 있습니다.
                        </p>
                    </div>
                </div>
                <div className={styles.disclosureAlimtalkVariables}>
                    <span>#{'{'}후보자명{'}'} = {previewCandidateName}</span>
                    <span>#{'{'}브랜드명{'}'} = {previewBrandName}</span>
                    <span>수신 번호 = {previewRecipientPhone}</span>
                </div>
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
