"use client";

import React from 'react';
import { CheckCircle2, MessageSquare, Send, X } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { normalizeFranchiseLocationMasterData } from '@/lib/franchise-location-master';
import type { FranchiseLocation } from './locationMasterTypes';
import type {
    FranchiseLocationMessage,
    FranchiseLocationMessageSummary,
    LocationMessageKind,
    LocationRequestStatus
} from './locationMessageTypes';
import {
    createLocationMessage,
    fetchLocationMessages,
    updateLocationRequestStatus
} from './locationMessageRequests';

type LocationMessagePanelProps = {
    readonly open: boolean;
    readonly userId: string;
    readonly location: FranchiseLocation | null;
    readonly managerName: string;
    readonly onOpenChange: (open: boolean) => void;
    readonly onSummaryChange: (summary: FranchiseLocationMessageSummary) => void;
};

function formatRecordDate(value: string | null): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(parsed);
}

function getKindLabel(kind: LocationMessageKind): string {
    return kind === 'request' ? '요청' : '정보';
}

function getStatusLabel(status: LocationRequestStatus | null): string {
    return status === 'done' ? '처리완료' : '열림';
}

export function LocationMessagePanel({
    open,
    userId,
    location,
    managerName,
    onOpenChange,
    onSummaryChange
}: LocationMessagePanelProps) {
    const [messages, setMessages] = React.useState<readonly FranchiseLocationMessage[]>([]);
    const [draft, setDraft] = React.useState('');
    const [kind, setKind] = React.useState<LocationMessageKind>('note');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [updatingMessageId, setUpdatingMessageId] = React.useState('');

    React.useEffect(() => {
        if (!open) return undefined;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onOpenChange(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onOpenChange, open]);

    React.useEffect(() => {
        if (!open || !location || !userId) return undefined;
        let isActive = true;
        setIsLoading(true);
        void fetchLocationMessages({ userId, locationId: location.id })
            .then(result => {
                if (!isActive) return;
                setMessages(result.messages);
                onSummaryChange(result.summary);
            })
            .catch(error => {
                if (error instanceof Error) window.alert(error.message);
            })
            .finally(() => {
                if (isActive) setIsLoading(false);
            });
        return () => {
            isActive = false;
        };
    }, [location, onSummaryChange, open, userId]);

    if (!open || !location) return null;

    const data = normalizeFranchiseLocationMasterData(location);
    const canSubmit = draft.trim().length > 0 && !isSaving;

    const submitMessage = async () => {
        if (!canSubmit) return;
        setIsSaving(true);
        try {
            const result = await createLocationMessage({
                userId,
                locationId: location.id,
                body: draft,
                kind
            });
            setMessages(result.messages);
            onSummaryChange(result.summary);
            setDraft('');
            setKind('note');
        } catch (error) {
            if (error instanceof Error) window.alert(error.message);
            else throw error;
        } finally {
            setIsSaving(false);
        }
    };

    const updateRequest = async (message: FranchiseLocationMessage, requestStatus: LocationRequestStatus) => {
        setUpdatingMessageId(message.id);
        try {
            const result = await updateLocationRequestStatus({ userId, messageId: message.id, requestStatus });
            setMessages(result.messages);
            onSummaryChange(result.summary);
        } catch (error) {
            if (error instanceof Error) window.alert(error.message);
            else throw error;
        } finally {
            setUpdatingMessageId('');
        }
    };

    return (
        <div
            className={styles.locationMessageBackdrop}
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onOpenChange(false);
            }}
        >
            <section className={styles.locationMessagePanel} role="dialog" aria-modal="true" aria-label="물건 기록">
                <header className={styles.locationMessageHeader}>
                    <div>
                        <span className={styles.locationMessageEyebrow}><MessageSquare size={14} /> 물건 기록</span>
                        <h3>{location.name}</h3>
                        <p>{location.address || location.region || '주소 미등록'}</p>
                        <div className={styles.locationMessageMeta}>
                            <span>담당 {managerName}</span>
                            <span>{data.developmentStage}</span>
                        </div>
                    </div>
                    <button type="button" className={styles.locationMessageCloseButton} onClick={() => onOpenChange(false)} aria-label="닫기">
                        <X size={18} />
                    </button>
                </header>

                <div className={styles.locationMessageTimeline}>
                    {isLoading ? (
                        <div className={styles.locationMessageEmpty}>기록을 불러오고 있습니다.</div>
                    ) : messages.length === 0 ? (
                        <div className={styles.locationMessageEmpty}>아직 기록된 요청사항이 없습니다.</div>
                    ) : messages.map(message => (
                        <article
                            key={message.id}
                            className={message.kind === 'request' ? styles.locationMessageItemRequest : styles.locationMessageItem}
                        >
                            <div className={styles.locationMessageItemHeader}>
                                <strong>{message.authorName}</strong>
                                <time>{formatRecordDate(message.createdAt)}</time>
                            </div>
                            <div className={styles.locationMessageBadges}>
                                <span className={message.kind === 'request' ? styles.locationMessageBadgeRequest : styles.locationMessageBadgeNote}>
                                    {getKindLabel(message.kind)}
                                </span>
                                {message.kind === 'request' ? (
                                    <span className={message.requestStatus === 'done' ? styles.locationMessageBadgeDone : styles.locationMessageBadgeOpen}>
                                        {getStatusLabel(message.requestStatus)}
                                    </span>
                                ) : null}
                            </div>
                            <p>{message.body}</p>
                            {message.kind === 'request' && message.requestStatus === 'done' ? (
                                <small>{message.resolvedByName || '담당자'} 처리 · {formatRecordDate(message.resolvedAt)}</small>
                            ) : null}
                            {message.kind === 'request' && message.requestStatus !== 'done' ? (
                                <div className={styles.locationMessageItemActions}>
                                    <button
                                        type="button"
                                        onClick={() => updateRequest(message, 'done')}
                                        disabled={updatingMessageId === message.id}
                                    >
                                        <CheckCircle2 size={13} /> 처리완료
                                    </button>
                                </div>
                            ) : null}
                        </article>
                    ))}
                </div>

                <footer className={styles.locationMessageComposer}>
                    <div className={styles.locationMessageKindSwitch} aria-label="기록 종류">
                        <button
                            type="button"
                            className={kind === 'note' ? styles.locationMessageKindActive : ''}
                            onClick={() => setKind('note')}
                        >
                            정보
                        </button>
                        <button
                            type="button"
                            className={kind === 'request' ? styles.locationMessageKindActive : ''}
                            onClick={() => setKind('request')}
                        >
                            요청
                        </button>
                    </div>
                    <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="요청사항이나 확인한 정보를 남겨주세요"
                    />
                    <button type="button" onClick={submitMessage} disabled={!canSubmit}>
                        <Send size={15} /> 등록
                    </button>
                </footer>
            </section>
        </div>
    );
}
