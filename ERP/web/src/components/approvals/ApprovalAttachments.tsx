import React from 'react';
import { FilePlus2, Paperclip, Upload, X } from 'lucide-react';
import {
    formatApprovalAttachmentSize,
    mergeApprovalAttachmentFiles
} from './approvalAttachmentFiles';
import type { ApprovalAttachment } from './approvalTypes';
import styles from './ApprovalDocument.module.css';

type ApprovalAttachmentsProps = {
    readonly disabled?: boolean;
    readonly deletingAttachmentId?: string;
    readonly existing?: readonly ApprovalAttachment[];
    readonly files: readonly File[];
    readonly onDeleteExisting?: (attachment: ApprovalAttachment) => void;
    readonly onChange: (files: readonly File[]) => void;
};

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.jpg,.jpeg,.png,.webp';

export function ApprovalAttachments({
    deletingAttachmentId = '',
    disabled = false,
    existing = [],
    files,
    onChange,
    onDeleteExisting
}: ApprovalAttachmentsProps) {
    const [message, setMessage] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    function addFiles(selected: readonly File[]) {
        const result = mergeApprovalAttachmentFiles({ current: files, existingCount: existing.length, selected });
        onChange(result.files);
        setMessage(result.message);
        if (inputRef.current) inputRef.current.value = '';
    }

    return (
        <div className={styles.attachments}>
            <div className={styles.sectionHeading}>
                <span><Paperclip size={18} aria-hidden="true" /><strong>첨부파일</strong></span>
                <small>{existing.length + files.length}개</small>
            </div>
            {!disabled && (
                <div
                    className={styles.fileControl}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                        event.preventDefault();
                        addFiles(Array.from(event.dataTransfer.files));
                    }}
                >
                    <span className={styles.fileControlIcon}><FilePlus2 size={20} aria-hidden="true" /></span>
                    <span className={styles.fileControlText}><strong>첨부할 파일을 선택하세요</strong><small>이미지·PDF·업무 문서, 파일당 10MB, 최대 5개</small></span>
                    <button className={styles.fileSelectButton} onClick={() => inputRef.current?.click()} type="button"><Upload size={16} aria-hidden="true" />파일 선택</button>
                    <input
                        accept={ACCEPT}
                        aria-label="첨부파일 선택"
                        multiple
                        onChange={event => addFiles(Array.from(event.target.files ?? []))}
                        ref={inputRef}
                        type="file"
                    />
                </div>
            )}
            {message && <p className={styles.fileError} role="alert">{message}</p>}
            {(existing.length > 0 || files.length > 0) && (
                <ul className={styles.fileList}>
                    {existing.map(attachment => (
                        <li key={attachment.id}>
                            <span><Paperclip size={15} aria-hidden="true" /><span><strong>{attachment.name}</strong><small>저장된 파일</small></span></span>
                            {!disabled && onDeleteExisting && (
                                <button
                                    aria-label={`${attachment.name} 삭제`}
                                    disabled={deletingAttachmentId === attachment.id}
                                    onClick={() => onDeleteExisting(attachment)}
                                    type="button"
                                >
                                    <X size={15} aria-hidden="true" />
                                </button>
                            )}
                        </li>
                    ))}
                    {files.map((file, index) => (
                        <li key={`${file.name}-${index}`}>
                            <span><Paperclip size={15} aria-hidden="true" /><span><strong>{file.name}</strong><small>{formatApprovalAttachmentSize(file.size)} · 업로드 대기</small></span></span>
                            {!disabled && (
                                <button aria-label={`${file.name} 제거`} onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))} type="button">
                                    <X size={15} aria-hidden="true" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
