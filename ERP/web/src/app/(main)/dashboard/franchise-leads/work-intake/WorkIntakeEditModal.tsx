"use client";

import React from 'react';
import { WorkIntakeEditFields } from './WorkIntakeEditFields';
import { buildInitialEditForm, saveWorkIntakeEdit, type WorkIntakeEditForm } from './requests';
import type { WorkIntakeEditTarget } from './types';
import styles from './WorkIntakeEditModal.module.css';

type WorkIntakeEditModalProps = {
    readonly target: WorkIntakeEditTarget;
    readonly requesterId: string;
    readonly onCloseAction: () => void;
    readonly onSavedAction: () => void;
    readonly onErrorAction: (message: string) => void;
};

function titleFor(target: WorkIntakeEditTarget): string {
    if (target.kind === 'properties') return '입점 요청 수정';
    if (target.kind === 'leadRegistrations') return '가맹 희망자 등록 수정';
    return '예비 창업자 등록 수정';
}

export function WorkIntakeEditModal({ target, requesterId, onCloseAction, onSavedAction, onErrorAction }: WorkIntakeEditModalProps) {
    const [form, setForm] = React.useState<WorkIntakeEditForm>(() => buildInitialEditForm(target));
    const [isSaving, setIsSaving] = React.useState(false);

    const save = async () => {
        setIsSaving(true);
        try {
            await saveWorkIntakeEdit(target, form, requesterId);
            onSavedAction();
        } catch (error) {
            onErrorAction(error instanceof Error ? error.message : '수정 저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.modalBackdrop}>
            <section className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2>{titleFor(target)}</h2>
                    <p>저장 후 이미 밀어넣은 건은 어드민에서 `수정` 상태로 표시되고, 업데이트를 눌러야 대상 DB에 반영됩니다.</p>
                </div>
                <div className={styles.modalBody}>
                    <WorkIntakeEditFields form={form} onChangeAction={setForm} />
                </div>
                <div className={styles.modalActions}>
                    <button className={styles.secondaryButton} onClick={onCloseAction} disabled={isSaving}>취소</button>
                    <button className={styles.primaryButton} onClick={save} disabled={isSaving}>{isSaving ? '저장 중' : '수정 저장'}</button>
                </div>
            </section>
        </div>
    );
}
