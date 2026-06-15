"use client";

import React from 'react';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
import { getContractLockMessage, type DisclosureEligibility } from '@/lib/franchise-disclosure-deliveries';
import { LeadDisclosureDeliveryForm } from './LeadDisclosureDeliveryForm';
import { LeadDisclosureHistory } from './LeadDisclosureHistory';
import { useLeadDisclosureWorkflow } from './useLeadDisclosureWorkflow';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly leadId: string;
    readonly userId: string;
    readonly companyId?: string;
    readonly companyName: string;
    readonly leadName: string;
    readonly leadContact: string;
    readonly interestedBrand: string;
    readonly onEligibilityChange: (eligibility: DisclosureEligibility | null) => void;
};

export function LeadDisclosureSection({
    leadId,
    userId,
    companyId,
    companyName,
    leadName,
    leadContact,
    interestedBrand,
    onEligibilityChange
}: Props) {
    const disclosure = useLeadDisclosureWorkflow({
        leadId,
        userId,
        companyId,
        companyName,
        leadName,
        leadContact,
        interestedBrand,
        onEligibilityChange
    });
    const {
        channel,
        deliveryDocumentTitle,
        deliveryMemo,
        deliveries,
        eligibility,
        errorMessage,
        isLoading,
        isRecordingDelivery,
        message,
        recipientContact,
        recordDelivery,
        sentAt,
        setChannel,
        setDeliveryDocumentTitle,
        setDeliveryMemo,
        setRecipientContact,
        setSentAt
    } = disclosure;
    const eligibilityClass = eligibility?.isEligible ? styles.disclosureReady : styles.disclosureLocked;

    return (
        <section className={styles.detailSection}>
            <div className={styles.disclosureHeader}>
                <div>
                    <h3><FileText size={16} /> 정보공개서</h3>
                    <p className={styles.detailHint}>
                        {eligibility ? getContractLockMessage(eligibility) : errorMessage ? '발송 이력을 확인할 수 없습니다.' : '발송 이력을 확인 중입니다.'}
                    </p>
                </div>
                <span className={eligibilityClass}>
                    {eligibility?.isEligible ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    {eligibility?.isEligible ? '계약 가능' : eligibility?.hasDelivery ? `D-${eligibility.remainingDays ?? '-'}` : '발송 전'}
                </span>
            </div>

            {errorMessage && <div className={styles.disclosureError}>{errorMessage}</div>}
            {message && <div className={styles.disclosureMessage}>{message}</div>}

            <LeadDisclosureDeliveryForm
                documentTitle={deliveryDocumentTitle}
                sentAt={sentAt}
                channel={channel}
                recipientContact={recipientContact}
                deliveryMemo={deliveryMemo}
                isLoading={isLoading}
                isRecordingDelivery={isRecordingDelivery}
                onDocumentTitleChange={setDeliveryDocumentTitle}
                onSentAtChange={setSentAt}
                onChannelChange={setChannel}
                onRecipientContactChange={setRecipientContact}
                onDeliveryMemoChange={setDeliveryMemo}
                onRecordDelivery={() => void recordDelivery()}
            />

            <LeadDisclosureHistory deliveries={deliveries} />
        </section>
    );
}
