"use client";

import React from 'react';
import { useDialogFocusTrap } from '@/components/common/useDialogFocusTrap';
import {
    updatePropertyRegistrationAttachments,
    type PropertyRegistrationForm
} from '@/lib/franchise-property-registration';
import { uploadPropertyRegistrationAttachments } from '@/lib/franchise-property-registration-uploads';
import { formatMoneyText } from '@/lib/franchise-property-registration-format';
import { PropertyAddressMap } from './PropertyAddressMap';
import { PropertyAttachmentGallery } from './PropertyAttachmentGallery';
import { WorkIntakeEditFields } from './WorkIntakeEditFields';
import { buildInitialEditForm, saveWorkIntakeEdit, type WorkIntakeEditForm } from './requests';
import type { WorkIntakeEditTarget } from './types';
import styles from './WorkIntakeEditModal.module.css';

type WorkIntakeEditModalProps = {
    readonly target: WorkIntakeEditTarget;
    readonly requesterId: string;
    readonly isReadOnly?: boolean;
    readonly titleOverride?: string;
    readonly description?: string;
    readonly onCloseAction: () => void;
    readonly onSavedAction: () => void;
    readonly onErrorAction: (message: string) => void;
};

function titleFor(target: WorkIntakeEditTarget, isReadOnly: boolean): string {
    if (target.kind === 'properties') return isReadOnly ? '입점 요청 확인' : '입점 요청 확인/수정';
    if (target.kind === 'leadRegistrations') return isReadOnly ? '가맹 희망자 등록 확인' : '가맹 희망자 등록 수정';
    return isReadOnly ? '예비 창업자 등록 확인' : '예비 창업자 등록 확인/수정';
}

function displayValue(value: string): string {
    return value.trim() || '-';
}

function PropertyDetailSummary({ form }: { readonly form: PropertyRegistrationForm }) {
    const operatingDetails: readonly (readonly [string, string])[] = form.currentStatus === '영업중'
        ? [['현재 영업중 상호/매장명', form.operatingStoreName]]
        : [];
    const details: readonly (readonly [string, string])[] = [
        ['물건명', form.propertyName],
        ['현재 상태', form.currentStatus],
        ...operatingDetails,
        ['희망 브랜드', form.desiredBrand],
        ['업태/업종', [form.desiredBusinessType, form.desiredCategory].filter(Boolean).join(' / ')],
        ['주소', [form.propertyAddress, form.detailAddress].filter(Boolean).join(' ')],
        ['임대 조건', [
            form.deposit ? `보증금 ${formatMoneyText(form.deposit)}만원` : '',
            form.monthlyRent ? `월세 ${formatMoneyText(form.monthlyRent)}만원` : '',
            form.maintenanceFee ? `관리비 ${formatMoneyText(form.maintenanceFee)}만원` : '',
            form.premium ? `권리금 ${formatMoneyText(form.premium)}만원` : ''
        ].filter(Boolean).join(' / ')],
        ['상담 메모', form.consultationMemo],
        ['리스크 메모', form.riskMemo]
    ];

    return (
        <section className={styles.previewSection}>
            <div className={styles.previewHeader}>
                <h3>등록 내용 확인</h3>
                <span>{form.fileAttachments.length}개 첨부</span>
            </div>
            <dl className={styles.previewGrid}>
                {details.map(([label, value]) => (
                    <div key={label}>
                        <dt>{label}</dt>
                        <dd>{displayValue(value)}</dd>
                    </div>
                ))}
            </dl>
            <PropertyAddressMap address={form.propertyAddress} detailAddress={form.detailAddress} />
            <PropertyAttachmentGallery attachments={form.fileAttachments} />
        </section>
    );
}

export function WorkIntakeEditModal({
    target,
    requesterId,
    isReadOnly = false,
    titleOverride,
    description,
    onCloseAction,
    onSavedAction,
    onErrorAction
}: WorkIntakeEditModalProps) {
    const [form, setForm] = React.useState<WorkIntakeEditForm>(() => buildInitialEditForm(target));
    const [pendingPropertyFiles, setPendingPropertyFiles] = React.useState<readonly File[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);
    const cancelButtonRef = React.useRef<HTMLButtonElement>(null);
    const isSavingRef = React.useRef(isSaving);
    const titleId = React.useId();
    isSavingRef.current = isSaving;
    const closeModal = React.useCallback(() => {
        if (!isSavingRef.current) onCloseAction();
    }, [onCloseAction]);
    const dialogRef = useDialogFocusTrap<HTMLElement>(true, closeModal, cancelButtonRef);

    const save = async () => {
        if (isReadOnly) return;
        setIsSaving(true);
        try {
            let nextForm = form;
            if (target.kind === 'properties' && form.kind === 'properties' && pendingPropertyFiles.length > 0) {
                const uploadedAttachments = await uploadPropertyRegistrationAttachments({
                    propertyId: target.item.id,
                    files: pendingPropertyFiles,
                    attachments: form.value.fileAttachments
                });
                nextForm = {
                    kind: 'properties',
                    value: updatePropertyRegistrationAttachments(form.value, uploadedAttachments)
                };
                setForm(nextForm);
                setPendingPropertyFiles([]);
            }
            await saveWorkIntakeEdit(target, nextForm, requesterId);
            onSavedAction();
        } catch (error) {
            onErrorAction(error instanceof Error ? error.message : '수정 저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.modalBackdrop} onMouseDown={event => { if (event.currentTarget === event.target) closeModal(); }}>
            <section aria-labelledby={titleId} aria-modal="true" className={styles.modal} ref={dialogRef} role="dialog" tabIndex={-1}>
                <div className={styles.modalHeader}>
                    <h2 id={titleId}>{titleOverride || titleFor(target, isReadOnly)}</h2>
                    {description && <p>{description}</p>}
                </div>
                <form className={styles.modalForm} onSubmit={event => { event.preventDefault(); void save(); }}>
                    <div className={styles.modalBody}>
                        {form.kind === 'properties' && <PropertyDetailSummary form={form.value} />}
                        <fieldset className={styles.readOnlyFieldset} disabled={isReadOnly}>
                            <WorkIntakeEditFields
                                form={form}
                                archivedLeadStatus={target.kind === 'leadRegistrations' ? target.item.archivedStatus : undefined}
                                pendingPropertyFiles={pendingPropertyFiles}
                                onChangeAction={setForm}
                                onPendingPropertyFilesChangeAction={setPendingPropertyFiles}
                            />
                        </fieldset>
                    </div>
                    <div className={styles.modalActions}>
                        <button className={styles.secondaryButton} onClick={closeModal} disabled={isSaving} ref={cancelButtonRef} type="button">{isReadOnly ? '닫기' : '취소'}</button>
                        {!isReadOnly && <button className={styles.primaryButton} disabled={isSaving} type="submit">{isSaving ? '저장 중' : '수정 저장'}</button>}
                    </div>
                </form>
            </section>
        </div>
    );
}
