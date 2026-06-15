"use client";

import { X } from 'lucide-react';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';
import { ACTIVITY_TYPES } from './constants';
import type { FranchiseLead, LeadActivityType } from './types';

type LeadQuickActivityModalProps = {
    readonly lead: FranchiseLead;
    readonly activityType: LeadActivityType;
    readonly activityContent: string;
    readonly isSaving: boolean;
    readonly getManagerNameAction: (managerId?: string) => string;
    readonly onActivityTypeChangeAction: (activityType: LeadActivityType) => void;
    readonly onActivityContentChangeAction: (content: string) => void;
    readonly onCloseAction: () => void;
    readonly onSubmitAction: React.FormEventHandler<HTMLFormElement>;
};

export function LeadQuickActivityModal({
    lead,
    activityType,
    activityContent,
    isSaving,
    getManagerNameAction,
    onActivityTypeChangeAction,
    onActivityContentChangeAction,
    onCloseAction,
    onSubmitAction
}: LeadQuickActivityModalProps) {
    return (
        <div className={styles.modalBackdrop}>
            <form className={`${styles.modalCard} ${styles.quickModalCard}`} onSubmit={onSubmitAction}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2>상담 이력 빠른 추가</h2>
                        <p>{lead.name} · {lead.mobile || '연락처 미입력'} · 담당자 {getManagerNameAction(lead.managerId)}</p>
                    </div>
                    <button type="button" onClick={onCloseAction} className={styles.closeButton} aria-label="빠른 활동 기록 닫기">
                        <X size={20} strokeWidth={2.2} />
                    </button>
                </div>
                <div className={styles.quickActivityBody}>
                    <label>
                        이력 유형
                        <select value={activityType} onChange={(event) => onActivityTypeChangeAction(event.target.value as LeadActivityType)}>
                            {ACTIVITY_TYPES.filter(type => type !== '상태변경' && type !== '고객전환').map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        상담 내용
                        <textarea
                            value={activityContent}
                            onChange={(event) => onActivityContentChangeAction(event.target.value)}
                            placeholder="통화 결과, 고객 반응, 다음 액션을 짧게 기록하세요."
                            autoFocus
                        />
                    </label>
                </div>
                <div className={styles.modalActions}>
                    <button type="button" className={styles.secondaryButton} onClick={onCloseAction} disabled={isSaving}>취소</button>
                    <button type="submit" className={styles.primaryButton} disabled={isSaving}>
                        {isSaving ? '저장 중' : '이력 추가'}
                    </button>
                </div>
            </form>
        </div>
    );
}
