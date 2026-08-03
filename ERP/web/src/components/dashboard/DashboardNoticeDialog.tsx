"use client";

import React from 'react';
import { Megaphone, Pin, X } from 'lucide-react';
import { useModalFocusTrap } from '@/components/common/useModalFocusTrap';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

export type DashboardNoticeType = 'team' | 'system';

export type DashboardNoticeDraft = {
    readonly title: string;
    readonly content: string;
    readonly type: DashboardNoticeType;
    readonly isPinned: boolean;
};

export const EMPTY_DASHBOARD_NOTICE_DRAFT: DashboardNoticeDraft = {
    title: '',
    content: '',
    type: 'team',
    isPinned: false
};

type DashboardNoticeDialogProps = {
    readonly isOpen: boolean;
    readonly draft: DashboardNoticeDraft;
    readonly canCreateSystemNotice: boolean;
    readonly isSaving: boolean;
    readonly onClose: () => void;
    readonly onDraftChange: (draft: DashboardNoticeDraft) => void;
    readonly onSubmit: () => void;
};

export function DashboardNoticeDialog({
    isOpen,
    draft,
    canCreateSystemNotice,
    isSaving,
    onClose,
    onDraftChange,
    onSubmit
}: DashboardNoticeDialogProps) {
    const titleId = React.useId();
    const pinnedInputId = React.useId();
    const dialogRef = React.useRef<HTMLElement | null>(null);
    const titleInputRef = React.useRef<HTMLInputElement | null>(null);
    useModalFocusTrap({ isOpen, onClose, dialogRef, initialFocusRef: titleInputRef });

    if (!isOpen) return null;

    return (
        <div className={styles.modalBackdrop} role="presentation">
            <section
                ref={dialogRef}
                className={`${styles.modalCard} ${styles.quickModalCard}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                onMouseDown={event => event.stopPropagation()}
            >
                <header className={styles.modalHeader}>
                    <div>
                        <h2 id={titleId} className="flex items-center gap-2">
                            <Megaphone size={18} aria-hidden="true" />
                            신규 공지사항 작성
                        </h2>
                        <p>팀 또는 전체 구성원에게 전달할 공지를 작성합니다.</p>
                    </div>
                    <button type="button" className={styles.closeButton} onClick={onClose} aria-label="공지사항 작성 닫기">
                        <X size={18} />
                    </button>
                </header>

                <div className={styles.formGrid}>
                    <div className={styles.formField}>
                        <span>공지 유형</span>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                className={draft.type === 'team' ? styles.primaryButton : styles.secondaryButton}
                                onClick={() => onDraftChange({ ...draft, type: 'team' })}
                            >
                                팀 공지
                            </button>
                            {canCreateSystemNotice ? (
                                <button
                                    type="button"
                                    className={draft.type === 'system' ? styles.dangerOutlineButton : styles.secondaryButton}
                                    onClick={() => onDraftChange({ ...draft, type: 'system' })}
                                >
                                    전체 시스템 공지
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <label className={styles.formField}>
                        <span>제목</span>
                        <input
                            ref={titleInputRef}
                            type="text"
                            placeholder="제목을 입력하세요"
                            value={draft.title}
                            onChange={event => onDraftChange({ ...draft, title: event.target.value })}
                        />
                    </label>
                </div>

                <label className={styles.memoLabel}>
                    <span>내용</span>
                    <textarea
                        placeholder="공지할 내용을 입력하세요"
                        value={draft.content}
                        onChange={event => onDraftChange({ ...draft, content: event.target.value })}
                    />
                </label>

                <label className={styles.formFieldLabelRow} htmlFor={pinnedInputId}>
                    <span className="flex items-center gap-2">
                        <input
                            id={pinnedInputId}
                            type="checkbox"
                            checked={draft.isPinned}
                            onChange={event => onDraftChange({ ...draft, isPinned: event.target.checked })}
                        />
                        <Pin size={14} aria-hidden="true" />
                        상단 고정
                    </span>
                </label>

                <div className={styles.modalActions}>
                    <button type="button" className={styles.secondaryButton} onClick={onClose}>
                        취소
                    </button>
                    <button type="button" className={styles.primaryButton} onClick={onSubmit} disabled={isSaving}>
                        {isSaving ? '저장 중...' : '등록하기'}
                    </button>
                </div>
            </section>
        </div>
    );
}
