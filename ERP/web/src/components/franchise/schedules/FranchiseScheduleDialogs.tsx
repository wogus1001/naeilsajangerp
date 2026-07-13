"use client";

import { X } from 'lucide-react';
import type { FranchiseScheduleItem, FranchiseScheduleStatus } from './franchiseScheduleViewModel';
import styles from './FranchiseSchedulePage.module.css';

export type ScheduleFormValue = {
    readonly id: string;
    readonly title: string;
    readonly date: string;
    readonly status: FranchiseScheduleStatus;
    readonly assigneeName: string;
    readonly managerName: string;
    readonly details: string;
};

type DialogProps = {
    readonly value: ScheduleFormValue;
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

export function FranchiseScheduleDialog({ value, mode, saving, onChange, onClose, onSubmit }: DialogProps) {
    const update = (patch: Partial<ScheduleFormValue>) => onChange({ ...value, ...patch });
    const updateStatus = (nextStatus: string) => {
        const status = nextStatus === '진행중' || nextStatus === '완료' || nextStatus === '지연' || nextStatus === '취소' ? nextStatus : '예정';
        update({ status });
    };
    return (
        <div className={styles.overlay} role="presentation">
            <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="schedule-dialog-title">
                <header className={styles.dialogHeader}>
                    <h2 id="schedule-dialog-title">{mode === 'create' ? '수동 일정 등록' : '수동 일정 수정'}</h2>
                    <button className={styles.iconButton} type="button" onClick={onClose} aria-label="닫기" title="닫기">
                        <X size={18} />
                    </button>
                </header>
                <div className={styles.formGrid}>
                    <label>제목<input value={value.title} onChange={event => update({ title: event.currentTarget.value })} /></label>
                    <label>날짜<input type="date" value={value.date} onChange={event => update({ date: event.currentTarget.value })} /></label>
                    <label>상태<select value={value.status} onChange={event => updateStatus(event.currentTarget.value)}>{STATUS_OPTIONS.map(status => <option key={status}>{status}</option>)}</select></label>
                    <label>담당자<input value={value.assigneeName} onChange={event => update({ assigneeName: event.currentTarget.value })} /></label>
                    <label>관리자<input value={value.managerName} onChange={event => update({ managerName: event.currentTarget.value })} /></label>
                    <label className={styles.fullField}>메모<textarea value={value.details} onChange={event => update({ details: event.currentTarget.value })} /></label>
                </div>
                <footer className={styles.dialogActions}>
                    <button className={styles.secondaryButton} type="button" onClick={onClose}>취소</button>
                    <button className={styles.primaryButton} type="button" disabled={saving || !value.title || !value.date} onClick={onSubmit}>
                        {saving ? '저장 중' : '저장'}
                    </button>
                </footer>
            </section>
        </div>
    );
}

export function FranchiseScheduleConfirm({ item, action, saving, onClose, onConfirm }: ConfirmProps) {
    const isDelete = action === 'delete';
    return (
        <div className={styles.overlay} role="presentation">
            <section className={styles.confirmDialog} role="alertdialog" aria-modal="true" aria-labelledby="schedule-confirm-title">
                <h2 id="schedule-confirm-title">{isDelete ? '일정을 삭제할까요?' : '완료 처리할까요?'}</h2>
                <p>{item.title}</p>
                <footer className={styles.dialogActions}>
                    <button className={styles.secondaryButton} type="button" onClick={onClose}>취소</button>
                    <button className={isDelete ? styles.dangerButton : styles.primaryButton} type="button" disabled={saving} onClick={onConfirm}>
                        {saving ? '처리 중' : isDelete ? '삭제' : '완료'}
                    </button>
                </footer>
            </section>
        </div>
    );
}
