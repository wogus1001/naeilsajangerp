"use client";

import React from 'react';
import { X } from 'lucide-react';
import type { FranchiseScheduleAssignee, FranchiseScheduleItem, FranchiseScheduleStatus, FranchiseScheduleVisibility } from './franchiseScheduleViewModel';
import styles from './FranchiseSchedulePage.module.css';

export type ScheduleFormValue = {
    readonly id: string;
    readonly title: string;
    readonly date: string;
    readonly status: FranchiseScheduleStatus;
    readonly visibility: FranchiseScheduleVisibility;
    readonly assigneeProfileId: string;
    readonly details: string;
};

type DialogProps = {
    readonly value: ScheduleFormValue;
    readonly assignees: readonly FranchiseScheduleAssignee[];
    readonly assigneesLoading: boolean;
    readonly assigneesError: string;
    readonly requesterProfileId: string;
    readonly mode: 'create' | 'edit';
    readonly saving: boolean;
    readonly onChange: (value: ScheduleFormValue) => void;
    readonly onClose: () => void;
    readonly onSubmit: () => void;
};

type ConfirmProps = {
    readonly item: FranchiseScheduleItem;
    readonly action: 'complete' | 'delete';
    readonly saving: boolean;
    readonly onClose: () => void;
    readonly onConfirm: () => void;
};

const STATUS_OPTIONS: readonly FranchiseScheduleStatus[] = ['예정', '진행중', '완료', '지연', '취소'];

function useModalFocus(onClose: () => void) {
    const overlayRef = React.useRef<HTMLDivElement>(null);
    const dialogRef = React.useRef<HTMLElement>(null);
    const initialFocusRef = React.useRef<HTMLButtonElement>(null);
    const onCloseRef = React.useRef(onClose);

    React.useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    React.useEffect(() => {
        const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const siblings = Array.from(overlayRef.current?.parentElement?.children || []).filter(
            (element): element is HTMLElement => element instanceof HTMLElement && element !== overlayRef.current
        );
        const siblingStates = siblings.map(element => ({
            element,
            ariaHidden: element.getAttribute('aria-hidden'),
            inert: element.hasAttribute('inert')
        }));
        siblings.forEach(element => {
            element.setAttribute('aria-hidden', 'true');
            element.setAttribute('inert', '');
        });
        const focusFrame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (!focusableElements?.length) return;
            const first = focusableElements[0];
            const last = focusableElements[focusableElements.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown);
            siblingStates.forEach(({ element, ariaHidden, inert }) => {
                if (ariaHidden === null) element.removeAttribute('aria-hidden');
                else element.setAttribute('aria-hidden', ariaHidden);
                if (!inert) element.removeAttribute('inert');
            });
            previouslyFocused?.focus();
        };
    }, []);

    return { dialogRef, initialFocusRef, overlayRef };
}

export function FranchiseScheduleDialog({ value, assignees, assigneesLoading, assigneesError, requesterProfileId, mode, saving, onChange, onClose, onSubmit }: DialogProps) {
    const { dialogRef, initialFocusRef, overlayRef } = useModalFocus(onClose);
    const update = (patch: Partial<ScheduleFormValue>) => onChange({ ...value, ...patch });
    const updateStatus = (nextStatus: string) => {
        const status = nextStatus === '진행중' || nextStatus === '완료' || nextStatus === '지연' || nextStatus === '취소' ? nextStatus : '예정';
        update({ status });
    };
    const updateVisibility = (visibility: FranchiseScheduleVisibility) => {
        update({
            visibility,
            assigneeProfileId: visibility === 'personal' ? requesterProfileId : value.assigneeProfileId
        });
    };
    return (
        <div ref={overlayRef} className={styles.overlay} role="presentation">
            <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="schedule-dialog-title">
                <header className={styles.dialogHeader}>
                    <h2 id="schedule-dialog-title">{mode === 'create' ? '수동 일정 등록' : '수동 일정 수정'}</h2>
                    <button ref={initialFocusRef} className={styles.iconButton} type="button" onClick={onClose} aria-label="닫기" title="닫기">
                        <X size={18} />
                    </button>
                </header>
                <div className={styles.formGrid}>
                    <fieldset className={styles.visibilityField}>
                        <legend>일정 구분</legend>
                        <div className={styles.visibilityControl}>
                            <label className={value.visibility === 'shared' ? styles.visibilityOptionActive : styles.visibilityOption}>
                                <input type="radio" name="schedule-visibility" checked={value.visibility === 'shared'} onChange={() => updateVisibility('shared')} />
                                <span><strong>공유 일정</strong><small>회사 구성원 모두 확인</small></span>
                            </label>
                            <label className={value.visibility === 'personal' ? styles.visibilityOptionActive : styles.visibilityOption}>
                                <input type="radio" name="schedule-visibility" checked={value.visibility === 'personal'} onChange={() => updateVisibility('personal')} />
                                <span><strong>개인 일정</strong><small>나만 확인</small></span>
                            </label>
                        </div>
                    </fieldset>
                    <label>제목<input value={value.title} onChange={event => update({ title: event.currentTarget.value })} /></label>
                    <label>날짜<input type="date" value={value.date} onChange={event => update({ date: event.currentTarget.value })} /></label>
                    <label>상태<select value={value.status} onChange={event => updateStatus(event.currentTarget.value)}>{STATUS_OPTIONS.map(status => <option key={status}>{status}</option>)}</select></label>
                    <label>담당자<select value={value.assigneeProfileId} disabled={assigneesLoading || value.visibility === 'personal'} onChange={event => update({ assigneeProfileId: event.currentTarget.value })}>
                        <option value="">{assigneesLoading ? '담당자 불러오는 중' : '담당자 선택'}</option>
                        {assignees.map(assignee => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}
                    </select>{assigneesError && <span className={styles.fieldError}>{assigneesError}</span>}</label>
                    <label className={styles.fullField}>메모<textarea value={value.details} onChange={event => update({ details: event.currentTarget.value })} /></label>
                </div>
                <footer className={styles.dialogActions}>
                    <button className={styles.secondaryButton} type="button" onClick={onClose}>취소</button>
                    <button className={styles.primaryButton} type="button" disabled={saving || !value.title || !value.date || !value.assigneeProfileId} onClick={onSubmit}>
                        {saving ? '저장 중' : '저장'}
                    </button>
                </footer>
            </section>
        </div>
    );
}

export function FranchiseScheduleConfirm({ item, action, saving, onClose, onConfirm }: ConfirmProps) {
    const { dialogRef, initialFocusRef, overlayRef } = useModalFocus(onClose);
    const isDelete = action === 'delete';
    return (
        <div ref={overlayRef} className={styles.overlay} role="presentation">
            <section ref={dialogRef} className={styles.confirmDialog} role="alertdialog" aria-modal="true" aria-labelledby="schedule-confirm-title">
                <h2 id="schedule-confirm-title">{isDelete ? '일정을 삭제할까요?' : '완료 처리할까요?'}</h2>
                <p>{item.title}</p>
                <footer className={styles.dialogActions}>
                    <button ref={initialFocusRef} className={styles.secondaryButton} type="button" onClick={onClose}>취소</button>
                    <button className={isDelete ? styles.dangerButton : styles.primaryButton} type="button" disabled={saving} onClick={onConfirm}>
                        {saving ? '처리 중' : isDelete ? '삭제' : '완료'}
                    </button>
                </footer>
            </section>
        </div>
    );
}
