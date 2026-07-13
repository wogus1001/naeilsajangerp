import { FilePlus2, Paperclip, X } from 'lucide-react';
import styles from './ApprovalDocument.module.css';

type ApprovalAttachmentsProps = {
    readonly disabled?: boolean;
    readonly files: readonly File[];
    readonly onChange: (files: readonly File[]) => void;
};

export function ApprovalAttachments({ disabled = false, files, onChange }: ApprovalAttachmentsProps) {
    return (
        <div className={styles.attachments}>
            <div className={styles.sectionHeading}>
                <span><Paperclip size={18} aria-hidden="true" /><strong>첨부파일</strong></span>
                <small>{files.length}개</small>
            </div>
            {!disabled && (
                <label className={styles.fileControl}>
                    <FilePlus2 size={18} aria-hidden="true" />
                    <span><strong>파일 선택</strong><small>이미지·PDF·업무 문서, 파일당 10MB, 최대 5개</small></span>
                    <input accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.jpg,.jpeg,.png,.webp" multiple onChange={event => onChange([...files, ...Array.from(event.target.files ?? [])].slice(0, 5))} type="file" />
                </label>
            )}
            {files.length > 0 && (
                <ul className={styles.fileList}>
                    {files.map((file, index) => (
                        <li key={`${file.name}-${index}`}>
                            <span><Paperclip size={15} aria-hidden="true" />{file.name}</span>
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
