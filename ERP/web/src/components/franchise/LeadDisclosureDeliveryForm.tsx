"use client";

import React from 'react';
import { Send } from 'lucide-react';
import {
    DISCLOSURE_CHANNELS,
    type DisclosureChannel
} from '@/lib/franchise-disclosure-deliveries';
import { CHANNEL_LABELS, isDisclosureChannel } from './leadDisclosureFormUtils';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly documentTitle: string;
    readonly sentAt: string;
    readonly channel: DisclosureChannel;
    readonly recipientContact: string;
    readonly deliveryMemo: string;
    readonly isLoading: boolean;
    readonly isRecordingDelivery: boolean;
    readonly onDocumentTitleChange: (title: string) => void;
    readonly onSentAtChange: (sentAt: string) => void;
    readonly onChannelChange: (channel: DisclosureChannel) => void;
    readonly onRecipientContactChange: (contact: string) => void;
    readonly onDeliveryMemoChange: (memo: string) => void;
    readonly onRecordDelivery: () => void;
};

export function LeadDisclosureDeliveryForm({
    documentTitle,
    sentAt,
    channel,
    recipientContact,
    deliveryMemo,
    isLoading,
    isRecordingDelivery,
    onDocumentTitleChange,
    onSentAtChange,
    onChannelChange,
    onRecipientContactChange,
    onDeliveryMemoChange,
    onRecordDelivery
}: Props) {
    const handleChannelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextChannel = event.currentTarget.value;
        if (isDisclosureChannel(nextChannel)) onChannelChange(nextChannel);
    };

    return (
        <div className={styles.disclosureFormBlock}>
            <div className={styles.disclosureBlockTitle}>
                <strong>발송 기록</strong>
                <span>14일 잠금</span>
            </div>
            <div className={styles.disclosureFormGrid}>
                <label>
                    정보공개서명
                    <input value={documentTitle} onChange={(event) => onDocumentTitleChange(event.currentTarget.value)} disabled={isLoading} />
                </label>
                <label>
                    발송 채널
                    <select value={channel} onChange={handleChannelChange}>
                        {DISCLOSURE_CHANNELS.map(option => (
                            <option key={option} value={option}>{CHANNEL_LABELS[option]}</option>
                        ))}
                    </select>
                </label>
                <label>
                    발송일시
                    <input type="datetime-local" value={sentAt} onChange={(event) => onSentAtChange(event.currentTarget.value)} />
                </label>
                <label>
                    수신 연락처
                    <input value={recipientContact} onChange={(event) => onRecipientContactChange(event.currentTarget.value)} />
                </label>
            </div>
            <label className={styles.disclosureMemoLabel}>
                발송 메모
                <textarea value={deliveryMemo} onChange={(event) => onDeliveryMemoChange(event.currentTarget.value)} />
            </label>
            <button type="button" className={styles.primaryButton} onClick={onRecordDelivery} disabled={isRecordingDelivery || !documentTitle.trim()}>
                <Send size={14} />
                {isRecordingDelivery ? '저장 중' : '발송 기록'}
            </button>
        </div>
    );
}
