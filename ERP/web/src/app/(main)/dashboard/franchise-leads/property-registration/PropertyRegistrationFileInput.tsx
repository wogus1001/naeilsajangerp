"use client";

import React from 'react';
import { Download, FileText, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import {
    PROPERTY_ATTACHMENT_POLICY,
    type PropertyRegistrationFileAttachment
} from '@/lib/franchise-property-registration';
import {
    isOpenablePropertyAttachment,
    isPreviewablePropertyAttachment
} from '@/lib/franchise-property-registration-uploads';
import { formatByteSize } from '@/lib/franchise-property-registration-format';
import styles from './PropertyRegistrationForm.module.css';

type PropertyRegistrationFileInputProps = {
    readonly attachments: readonly PropertyRegistrationFileAttachment[];
    readonly pendingFiles?: readonly File[];
    readonly onChange: (attachments: readonly PropertyRegistrationFileAttachment[]) => void;
    readonly onPendingFilesChange?: (files: readonly File[]) => void;
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

function isImageAttachment(file: PropertyRegistrationFileAttachment): boolean {
    return file.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp'].includes(extensionOf(file.name));
}

function attachmentFor(file: File): PropertyRegistrationFileAttachment {
    return { name: file.name, size: file.size, type: file.type || extensionOf(file.name) };
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

function dedupePendingFiles(files: readonly File[]): readonly File[] {
    const seen = new Set<string>();
    return files.filter(file => {
        const key = attachmentKey(attachmentFor(file));
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function totalSize(files: readonly PropertyRegistrationFileAttachment[]): number {
    return files.reduce((sum, file) => sum + file.size, 0);
}

function getAttachmentOpenUrl(file: PropertyRegistrationFileAttachment, localFileUrls: ReadonlyMap<string, string>): string {
    return file.publicUrl || localFileUrls.get(attachmentKey(file)) || '';
}

export function PropertyRegistrationFileInput({
    attachments,
    pendingFiles = [],
    onChange,
    onPendingFilesChange,
    onError
}: PropertyRegistrationFileInputProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [localFileUrls, setLocalFileUrls] = React.useState<ReadonlyMap<string, string>>(() => new Map());

    React.useEffect(() => {
        const nextUrls = new Map<string, string>();
        for (const file of pendingFiles) {
            nextUrls.set(attachmentKey(attachmentFor(file)), URL.createObjectURL(file));
        }
        setLocalFileUrls(nextUrls);
        return () => {
            for (const url of nextUrls.values()) URL.revokeObjectURL(url);
        };
    }, [pendingFiles]);

    const selectFiles = (files: FileList | null) => {
        const selected = Array.from(files || []);
        if (selected.length === 0) return;

        const rejected = selected.find(file => !isAccepted(file));
        if (rejected) {
            onError('PDF, JPG, PNG, WebP 파일만 등록할 수 있습니다.');
            return;
        }

        const tooLarge = selected.find(file => file.size > PROPERTY_ATTACHMENT_POLICY.maxFileSizeBytes);
        if (tooLarge) {
            onError(`${tooLarge.name} 파일은 ${formatByteSize(tooLarge.size)}입니다.\n파일 1개는 ${formatByteSize(PROPERTY_ATTACHMENT_POLICY.maxFileSizeBytes)} 이하로 등록해주세요.`);
            return;
        }

        const nextAttachments = dedupeFiles([
            ...attachments,
            ...selected.map(attachmentFor)
        ]);

        if (nextAttachments.length > PROPERTY_ATTACHMENT_POLICY.maxFiles) {
            onError(`첨부 파일은 최대 ${PROPERTY_ATTACHMENT_POLICY.maxFiles}개까지 등록할 수 있습니다.`);
            return;
        }

        if (totalSize(nextAttachments) > PROPERTY_ATTACHMENT_POLICY.maxTotalSizeBytes) {
            onError(`현재 선택한 파일은 총 ${formatByteSize(totalSize(nextAttachments))}입니다.\n첨부 파일 총 용량은 ${formatByteSize(PROPERTY_ATTACHMENT_POLICY.maxTotalSizeBytes)} 이하로 등록해주세요.`);
            return;
        }

        onChange(nextAttachments);
        onPendingFilesChange?.(dedupePendingFiles([...pendingFiles, ...selected]));
        if (inputRef.current) inputRef.current.value = '';
    };

    const removeFile = (target: PropertyRegistrationFileAttachment) => {
        const targetKey = attachmentKey(target);
        onChange(attachments.filter(file => attachmentKey(file) !== targetKey));
        onPendingFilesChange?.(pendingFiles.filter(file => attachmentKey(attachmentFor(file)) !== targetKey));
    };

    return (
        <div className={styles.fileBox}>
            <div className={styles.fileHeader}>
                <div>
                    <strong>도면 또는 공실 매장 사진 등록</strong>
                    <span>PDF/JPG/PNG/WebP · 파일당 10MB · 최대 10개 · 총 50MB</span>
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
                    {attachments.map(file => {
                        const openUrl = getAttachmentOpenUrl(file, localFileUrls);
                        const canOpen = isOpenablePropertyAttachment(file) || Boolean(openUrl);
                        const canPreview = isPreviewablePropertyAttachment(file) || (Boolean(openUrl) && isImageAttachment(file));
                        return (
                            <li key={attachmentKey(file)}>
                                {canPreview ? (
                                    <img className={styles.fileThumb} src={openUrl} alt={`${file.name} 미리보기`} />
                                ) : isImageAttachment(file) ? (
                                    <ImageIcon size={16} />
                                ) : (
                                    <FileText size={16} />
                                )}
                                {canOpen ? (
                                    <a
                                        className={styles.fileNameLink}
                                        href={openUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {file.name}
                                    </a>
                                ) : (
                                    <span>{file.name}</span>
                                )}
                                <em>{formatByteSize(file.size)}</em>
                                {canOpen ? (
                                    <a
                                        className={styles.fileDownloadLink}
                                        href={openUrl}
                                        rel="noreferrer"
                                        download={file.name}
                                        aria-label={`${file.name} 다운로드`}
                                    >
                                        <Download size={14} /> 다운로드
                                    </a>
                                ) : (
                                    <span
                                        className={styles.fileUnavailableBadge}
                                        title="기존 첨부에 저장된 파일 URL이 없어 다시 첨부한 뒤 저장해야 다운로드할 수 있습니다."
                                    >
                                        재첨부 필요
                                    </span>
                                )}
                                <button type="button" aria-label={`${file.name} 제거`} onClick={() => removeFile(file)}>
                                    <Trash2 size={15} />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className={styles.emptyFiles}>선택된 파일이 없습니다.</p>
            )}
        </div>
    );
}
