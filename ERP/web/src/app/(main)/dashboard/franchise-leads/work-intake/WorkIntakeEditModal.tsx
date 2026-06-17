"use client";

import React from 'react';
import { buildInitialEditForm, saveWorkIntakeEdit, type EditFormState } from './requests';
import type { WorkIntakeEditTarget } from './types';
import styles from './page.module.css';

type WorkIntakeEditModalProps = {
    readonly target: WorkIntakeEditTarget;
    readonly requesterId: string;
    readonly onCloseAction: () => void;
    readonly onSavedAction: () => void;
    readonly onErrorAction: (message: string) => void;
};

function titleFor(target: WorkIntakeEditTarget): string {
    if (target.kind === 'properties') return '물건 등록 수정';
    if (target.kind === 'leadRegistrations') return '가맹 희망자 등록 수정';
    return '프랜차이즈 매칭 요청 수정';
}

function fieldsFor(target: WorkIntakeEditTarget): readonly (keyof EditFormState)[] {
    if (target.kind === 'properties') {
        return ['name', 'status', 'desiredRegion', 'desiredBrand', 'desiredCategory', 'address', 'deposit', 'monthlyRent'];
    }
    if (target.kind === 'leadRegistrations') {
        return ['name', 'mobile', 'status', 'desiredRegion', 'desiredBrand', 'budgetMin', 'budgetMax', 'memo'];
    }
    return ['name', 'mobile', 'email', 'desiredRegion', 'desiredCategory', 'desiredBrand', 'totalBudget', 'ownedPropertyStatus', 'matchPriority', 'urgency', 'memo'];
}

const LABELS: Record<keyof EditFormState, string> = {
    name: '이름/물건명',
    mobile: '연락처',
    email: '이메일',
    status: '상태',
    desiredRegion: '지역',
    desiredBrand: '브랜드',
    desiredCategory: '업종',
    budgetMin: '예산 최소(만원)',
    budgetMax: '예산 최대(만원)',
    totalBudget: '총예산(만원)',
    deposit: '보증금(만원)',
    monthlyRent: '월세(만원)',
    address: '주소',
    ownedPropertyStatus: '보유 물건',
    matchPriority: '매칭 우선순위',
    urgency: '긴급도',
    memo: '메모'
};

export function WorkIntakeEditModal({ target, requesterId, onCloseAction, onSavedAction, onErrorAction }: WorkIntakeEditModalProps) {
    const [form, setForm] = React.useState<EditFormState>(() => buildInitialEditForm(target));
    const [isSaving, setIsSaving] = React.useState(false);

    const updateField = (key: keyof EditFormState, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

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
                <h2>{titleFor(target)}</h2>
                <p>저장 후 이미 밀어넣은 건은 어드민에서 `수정` 상태로 표시되고, 업데이트를 눌러야 대상 DB에 반영됩니다.</p>
                <div className={styles.editGrid}>
                    {fieldsFor(target).map(key => (
                        <label className={key === 'memo' || key === 'address' ? styles.fullField : ''} key={key}>
                            <span>{LABELS[key]}</span>
                            {key === 'memo' ? (
                                <textarea value={form[key]} onChange={event => updateField(key, event.target.value)} />
                            ) : (
                                <input value={form[key]} onChange={event => updateField(key, event.target.value)} />
                            )}
                        </label>
                    ))}
                </div>
                <div className={styles.modalActions}>
                    <button className={styles.secondaryButton} onClick={onCloseAction} disabled={isSaving}>취소</button>
                    <button className={styles.primaryButton} onClick={save} disabled={isSaving}>{isSaving ? '저장 중' : '수정 저장'}</button>
                </div>
            </section>
        </div>
    );
}
