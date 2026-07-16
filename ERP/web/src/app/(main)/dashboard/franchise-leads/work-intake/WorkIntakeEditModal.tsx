"use client";

import React from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import {
    updatePropertyRegistrationAttachments,
    type PropertyRegistrationFileAttachment,
    type PropertyRegistrationForm
} from '@/lib/franchise-property-registration';
import {
    isOpenablePropertyAttachment,
    isPreviewablePropertyAttachment,
    uploadPropertyRegistrationAttachments
} from '@/lib/franchise-property-registration-uploads';
import { formatByteSize } from '@/lib/franchise-property-registration-format';
import { WorkIntakeEditFields } from './WorkIntakeEditFields';
import { buildInitialEditForm, saveWorkIntakeEdit, type WorkIntakeEditForm } from './requests';
import type { WorkIntakeEditTarget } from './types';
import styles from './WorkIntakeEditModal.module.css';

type WorkIntakeEditModalProps = {
    readonly target: WorkIntakeEditTarget;
    readonly requesterId: string;
    readonly isReadOnly?: boolean;
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

function isImageAttachment(attachment: PropertyRegistrationFileAttachment): boolean {
    return attachment.type.startsWith('image/');
}

function PropertyAttachmentPreview({ attachment }: { readonly attachment: PropertyRegistrationFileAttachment }) {
    return (
        <li className={styles.previewFile}>
            {isPreviewablePropertyAttachment(attachment) ? (
                <img src={attachment.publicUrl || ''} alt={`${attachment.name} 미리보기`} />
            ) : (
                <span className={styles.previewFileIcon}>
                    {isImageAttachment(attachment) ? <ImageIcon size={16} /> : <FileText size={16} />}
                </span>
            )}
            <div>
                {isOpenablePropertyAttachment(attachment) ? (
                    <a href={attachment.publicUrl} target="_blank" rel="noreferrer">{attachment.name}</a>
                ) : (
                    <strong>{attachment.name}</strong>
                )}
                <small>{formatByteSize(attachment.size)}</small>
            </div>
        </li>
    );
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
            form.deposit ? `보증금 ${form.deposit}만원` : '',
            form.monthlyRent ? `월세 ${form.monthlyRent}만원` : '',
            form.maintenanceFee ? `관리비 ${form.maintenanceFee}만원` : ''
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
            {form.fileAttachments.length > 0 && (
                <ul className={styles.previewFiles}>
                    {form.fileAttachments.map(attachment => (
                        <PropertyAttachmentPreview
                            key={`${attachment.name}:${attachment.size}:${attachment.storagePath || ''}`}
                            attachment={attachment}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}

export function WorkIntakeEditModal({
    target,
    requesterId,
    isReadOnly = false,
    onCloseAction,
    onSavedAction,
    onErrorAction
}: WorkIntakeEditModalProps) {
    const [form, setForm] = React.useState<WorkIntakeEditForm>(() => buildInitialEditForm(target));
    const [pendingPropertyFiles, setPendingPropertyFiles] = React.useState<readonly File[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);

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
        <div className={styles.modalBackdrop}>
            <section className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2>{titleFor(target, isReadOnly)}</h2>
                </div>
                <div className={styles.modalBody}>
                    {form.kind === 'properties' && <PropertyDetailSummary form={form.value} />}
                    <fieldset className={styles.readOnlyFieldset} disabled={isReadOnly}>
                        <WorkIntakeEditFields
                            form={form}
                            pendingPropertyFiles={pendingPropertyFiles}
                            onChangeAction={setForm}
                            onPendingPropertyFilesChangeAction={setPendingPropertyFiles}
                        />
                    </fieldset>
                </div>
                <div className={styles.modalActions}>
                    <button className={styles.secondaryButton} onClick={onCloseAction} disabled={isSaving}>{isReadOnly ? '닫기' : '취소'}</button>
                    {!isReadOnly && (
                        <button className={styles.primaryButton} onClick={save} disabled={isSaving}>{isSaving ? '저장 중' : '수정 저장'}</button>
                    )}
                </div>
            </section>
        </div>
    );
}
