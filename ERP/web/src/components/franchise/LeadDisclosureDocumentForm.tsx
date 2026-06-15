"use client";

import React from 'react';
import { ExternalLink, Plus, Upload } from 'lucide-react';
import type { DocumentDraft } from './leadDisclosureFormUtils';
import { DISCLOSURE_UPLOAD_ACCEPT } from './leadDisclosureFormUtils';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly documentsCount: number;
    readonly draft: DocumentDraft;
    readonly isSavingDocument: boolean;
    readonly isUploadingDocument: boolean;
    readonly onDraftChange: (patch: Partial<DocumentDraft>) => void;
    readonly onFileUpload: (file: File | null) => void;
    readonly onSave: () => void;
};

export function LeadDisclosureDocumentForm({
    documentsCount,
    draft,
    isSavingDocument,
    isUploadingDocument,
    onDraftChange,
    onFileUpload,
    onSave
}: Props) {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0] ?? null;
        onFileUpload(file);
        event.currentTarget.value = '';
    };

    return (
        <div className={styles.disclosureFormBlock}>
            <div className={styles.disclosureBlockTitle}>
                <strong>문서 저장</strong>
                <span>{documentsCount.toLocaleString()}개</span>
            </div>
            <div className={styles.disclosureFormGrid}>
                <label>
                    문서명
                    <input value={draft.title} onChange={(event) => onDraftChange({ title: event.currentTarget.value })} />
                </label>
                <label>
                    버전
                    <input value={draft.version} onChange={(event) => onDraftChange({ version: event.currentTarget.value })} />
                </label>
                <label>
                    브랜드
                    <input value={draft.brandName} onChange={(event) => onDraftChange({ brandName: event.currentTarget.value })} />
                </label>
                <label>
                    가맹본부
                    <input value={draft.franchisorName} onChange={(event) => onDraftChange({ franchisorName: event.currentTarget.value })} />
                </label>
                <label className={styles.disclosureUploadLabel}>
                    정보공개서 파일
                    <span className={styles.disclosureUploadControl}>
                        <Upload size={14} />
                        {isUploadingDocument ? '업로드 중' : '파일 선택'}
                        <input type="file" accept={DISCLOSURE_UPLOAD_ACCEPT} onChange={handleFileChange} disabled={isUploadingDocument || isSavingDocument} />
                    </span>
                </label>
                <label>
                    발행일
                    <input type="date" value={draft.issuedAt} onChange={(event) => onDraftChange({ issuedAt: event.currentTarget.value })} />
                </label>
            </div>
            {draft.fileUrl && (
                <div className={styles.disclosureUploadedFile}>
                    <span>{draft.fileName || '업로드된 정보공개서'}</span>
                    <a href={draft.fileUrl} target="_blank" rel="noreferrer">
                        <ExternalLink size={13} />
                        문서 열기
                    </a>
                </div>
            )}
            <label className={styles.disclosureMemoLabel}>
                메모
                <textarea value={draft.memo} onChange={(event) => onDraftChange({ memo: event.currentTarget.value })} />
            </label>
            <button
                type="button"
                className={styles.secondaryButton}
                onClick={onSave}
                disabled={isSavingDocument || isUploadingDocument}
            >
                <Plus size={14} />
                {isSavingDocument ? '저장 중' : '문서 저장'}
            </button>
        </div>
    );
}
