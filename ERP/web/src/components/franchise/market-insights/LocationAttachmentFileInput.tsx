import React from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import {
    FRANCHISE_ATTACHMENT_POLICY,
    formatFranchiseFileSize,
    getFranchiseAttachmentExtension,
    getFranchiseAttachmentKey,
    isAcceptedFranchiseAttachment,
    type FranchiseFileAttachment
} from '@/lib/franchise-file-attachments';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type LocationAttachmentFileInputProps = {
    readonly attachments: readonly FranchiseFileAttachment[];
    readonly onChange: (attachments: readonly FranchiseFileAttachment[]) => void;
};

function totalSize(files: readonly FranchiseFileAttachment[]): number {
    return files.reduce((sum, file) => sum + file.size, 0);
}

function dedupeFiles(files: readonly FranchiseFileAttachment[]): readonly FranchiseFileAttachment[] {
    const seen = new Set<string>();
    return files.filter(file => {
        const key = getFranchiseAttachmentKey(file);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function LocationAttachmentFileInput({
    attachments,
    onChange
}: LocationAttachmentFileInputProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [error, setError] = React.useState('');

    const selectFiles = (files: FileList | null) => {
        const selected = Array.from(files || []);
        if (selected.length === 0) return;

        const rejected = selected.find(file => !isAcceptedFranchiseAttachment(file.name));
        if (rejected) {
            setError('PDF, JPG, PNG, WebP 파일만 등록할 수 있습니다.');
            return;
        }

        const tooLarge = selected.find(file => file.size > FRANCHISE_ATTACHMENT_POLICY.maxFileSizeBytes);
        if (tooLarge) {
            setError(`파일 1개 용량은 ${formatFranchiseFileSize(FRANCHISE_ATTACHMENT_POLICY.maxFileSizeBytes)} 이하로 등록해주세요.`);
            return;
        }

        const nextAttachments = dedupeFiles([
            ...attachments,
            ...selected.map(file => ({
                name: file.name,
                size: file.size,
                type: file.type || getFranchiseAttachmentExtension(file.name)
            }))
        ]);

        if (nextAttachments.length > FRANCHISE_ATTACHMENT_POLICY.maxFiles) {
            setError(`첨부 파일은 최대 ${FRANCHISE_ATTACHMENT_POLICY.maxFiles}개까지 등록할 수 있습니다.`);
            return;
        }

        if (totalSize(nextAttachments) > FRANCHISE_ATTACHMENT_POLICY.maxTotalSizeBytes) {
            setError(`첨부 파일 총 용량은 ${formatFranchiseFileSize(FRANCHISE_ATTACHMENT_POLICY.maxTotalSizeBytes)} 이하로 등록해주세요.`);
            return;
        }

        setError('');
        onChange(nextAttachments);
        if (inputRef.current) inputRef.current.value = '';
    };

    const removeFile = (target: FranchiseFileAttachment) => {
        setError('');
        onChange(attachments.filter(file => getFranchiseAttachmentKey(file) !== getFranchiseAttachmentKey(target)));
    };

    return (
        <div className={styles.locationFileBox}>
            <div className={styles.locationFileHeader}>
                <div>
                    <strong>도면·사진·자료 등록</strong>
                    <span>PDF/JPG/PNG/WebP · 파일당 10MB · 최대 10개 · 총 50MB</span>
                </div>
                <button type="button" className={styles.locationFileSelectButton} onClick={() => inputRef.current?.click()}>
                    <Upload size={15} /> 파일 선택
                </button>
            </div>
            <input
                ref={inputRef}
                className={styles.locationFileInput}
                type="file"
                multiple
                accept={FRANCHISE_ATTACHMENT_POLICY.accept}
                onChange={event => selectFiles(event.target.files)}
            />
            {error ? <p className={styles.locationFileError}>{error}</p> : null}
            {attachments.length > 0 ? (
                <ul className={styles.locationFileList}>
                    {attachments.map(file => (
                        <li key={getFranchiseAttachmentKey(file)}>
                            <FileText size={15} />
                            <span>{file.name}</span>
                            <em>{formatFranchiseFileSize(file.size)}</em>
                            <button type="button" aria-label={`${file.name} 제거`} onClick={() => removeFile(file)}>
                                <Trash2 size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={styles.locationEmptyFiles}>선택된 파일이 없습니다.</p>
            )}
        </div>
    );
}
