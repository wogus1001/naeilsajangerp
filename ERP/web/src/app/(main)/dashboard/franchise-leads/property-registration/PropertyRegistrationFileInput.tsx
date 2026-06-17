"use client";

import React from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import {
    PROPERTY_ATTACHMENT_POLICY,
    type PropertyRegistrationFileAttachment
} from '@/lib/franchise-property-registration';
import { formatByteSize } from '@/lib/franchise-property-registration-format';
import styles from './PropertyRegistrationForm.module.css';

type PropertyRegistrationFileInputProps = {
    readonly attachments: readonly PropertyRegistrationFileAttachment[];
    readonly onChange: (attachments: readonly PropertyRegistrationFileAttachment[]) => void;
    readonly onError: (message: string) => void;
};

function attachmentKey(file: PropertyRegistrationFileAttachment): string {
    return `${file.name}:${file.size}`;
}

function extensionOf(fileName: string): string {
    const index = fileName.lastIndexOf('.');
    return index >= 0 ? fileName.slice(index).toLowerCase() : '';
}

function isAccepted(file: File): boolean {
    const extension = extensionOf(file.name);
    return PROPERTY_ATTACHMENT_POLICY.acceptedExtensions.some(acceptedExtension => acceptedExtension === extension);
}

function dedupeFiles(files: readonly PropertyRegistrationFileAttachment[]): readonly PropertyRegistrationFileAttachment[] {
    const seen = new Set<string>();
    return files.filter(file => {
        const key = attachmentKey(file);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function totalSize(files: readonly PropertyRegistrationFileAttachment[]): number {
    return files.reduce((sum, file) => sum + file.size, 0);
}

export function PropertyRegistrationFileInput({
    attachments,
    onChange,
    onError
}: PropertyRegistrationFileInputProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const selectFiles = (files: FileList | null) => {
        const selected = Array.from(files || []);
        if (selected.length === 0) return;

        const rejected = selected.find(file => !isAccepted(file));
        if (rejected) {
            onError('PDF, JPG, PNG, WebP, HEIC 파일만 등록할 수 있습니다.');
            return;
        }

        const tooLarge = selected.find(file => file.size > PROPERTY_ATTACHMENT_POLICY.maxFileSizeBytes);
        if (tooLarge) {
            onError(`파일 1개 용량은 ${formatByteSize(PROPERTY_ATTACHMENT_POLICY.maxFileSizeBytes)} 이하로 등록해주세요.`);
            return;
        }

        const nextAttachments = dedupeFiles([
            ...attachments,
            ...selected.map(file => ({ name: file.name, size: file.size, type: file.type || extensionOf(file.name) }))
        ]);

        if (nextAttachments.length > PROPERTY_ATTACHMENT_POLICY.maxFiles) {
            onError(`첨부 파일은 최대 ${PROPERTY_ATTACHMENT_POLICY.maxFiles}개까지 등록할 수 있습니다.`);
            return;
        }

        if (totalSize(nextAttachments) > PROPERTY_ATTACHMENT_POLICY.maxTotalSizeBytes) {
            onError(`첨부 파일 총 용량은 ${formatByteSize(PROPERTY_ATTACHMENT_POLICY.maxTotalSizeBytes)} 이하로 등록해주세요.`);
            return;
        }

        onChange(nextAttachments);
        if (inputRef.current) inputRef.current.value = '';
    };

    const removeFile = (target: PropertyRegistrationFileAttachment) => {
        onChange(attachments.filter(file => attachmentKey(file) !== attachmentKey(target)));
    };

    return (
        <div className={styles.fileBox}>
            <div className={styles.fileHeader}>
                <div>
                    <strong>도면 또는 공실 매장 사진 등록</strong>
                    <span>PDF/JPG/PNG/WebP/HEIC · 파일당 10MB · 최대 10개 · 총 50MB</span>
                </div>
                <button type="button" className={styles.fileSelectButton} onClick={() => inputRef.current?.click()}>
                    <Upload size={16} /> 파일 선택
                </button>
            </div>
            <input
                ref={inputRef}
                className={styles.fileInput}
                type="file"
                multiple
                accept={PROPERTY_ATTACHMENT_POLICY.accept}
                onChange={event => selectFiles(event.target.files)}
            />
            {attachments.length > 0 ? (
                <ul className={styles.fileList}>
                    {attachments.map(file => (
                        <li key={attachmentKey(file)}>
                            <FileText size={16} />
                            <span>{file.name}</span>
                            <em>{formatByteSize(file.size)}</em>
                            <button type="button" aria-label={`${file.name} 제거`} onClick={() => removeFile(file)}>
                                <Trash2 size={15} />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={styles.emptyFiles}>선택된 파일이 없습니다.</p>
            )}
        </div>
    );
}
