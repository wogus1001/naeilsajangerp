"use client";

import React from 'react';
import { ExternalLink, FileText, Trash2, X } from 'lucide-react';
import { useAppDialog } from '@/components/common/AppDialogProvider';
import type { FranchiseDisclosureDocument } from '@/lib/franchise-disclosure-deliveries';
import type { DocumentDraft } from './leadDisclosureFormUtils';
import { LeadDisclosureDocumentForm } from './LeadDisclosureDocumentForm';
import styles from '@/app/(main)/dashboard/franchise-leads/page.module.css';

type Props = {
    readonly documents: readonly FranchiseDisclosureDocument[];
    readonly draft: DocumentDraft;
    readonly isSavingDocument: boolean;
    readonly isUploadingDocument: boolean;
    readonly deletingDocumentId: string;
    readonly selectedDocumentId: string;
    readonly onClose: () => void;
    readonly onDeleteDocument: (documentId: string) => void;
    readonly onDraftChange: (patch: Partial<DocumentDraft>) => void;
    readonly onFileUpload: (file: File | null) => void;
    readonly onSave: () => void;
    readonly onSelectDocument: (documentId: string) => void;
};

export function LeadDisclosureDocumentManagerDialog({
    documents,
    draft,
    isSavingDocument,
    isUploadingDocument,
    deletingDocumentId,
    selectedDocumentId,
    onClose,
    onDeleteDocument,
    onDraftChange,
    onFileUpload,
    onSave,
    onSelectDocument
}: Props) {
    const { showConfirm } = useAppDialog();
    const handleDeleteDocument = async (document: FranchiseDisclosureDocument) => {
        const confirmed = await showConfirm({
            message: `${document.title} 문서를 삭제할까요? 기존 발송 이력은 유지됩니다.`,
            title: '정보공개서 삭제',
            confirmText: '삭제',
            isDanger: true
        });
        if (!confirmed) return;
        onDeleteDocument(document.id);
    };

    return (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
            <div className={styles.modalCard} role="dialog" aria-modal="true" aria-labelledby="disclosure-document-manager-title" onMouseDown={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2 id="disclosure-document-manager-title">정보공개서 문서 관리</h2>
                        <p>회사별로 저장된 정보공개서를 등록하고 Gmail 발송 문서로 연결합니다.</p>
                    </div>
                    <button type="button" className={styles.closeButton} onClick={onClose} aria-label="문서 관리 닫기">
                        <X size={18} />
                    </button>
                </div>

                <LeadDisclosureDocumentForm
                    documentsCount={documents.length}
                    draft={draft}
                    isSavingDocument={isSavingDocument}
                    isUploadingDocument={isUploadingDocument}
                    onDraftChange={onDraftChange}
                    onFileUpload={onFileUpload}
                    onSave={onSave}
                />

                <div className={styles.disclosureHistory}>
                    {documents.length === 0 ? (
                        <article className={styles.disclosureHistoryItem}>
                            <div>
                                <strong>등록된 정보공개서가 없습니다.</strong>
                                <span>위의 문서 등록 영역에서 파일을 저장하면 Gmail 발송 문서 목록에 바로 연결됩니다.</span>
                            </div>
                        </article>
                    ) : documents.map(document => (
                        <article key={document.id} className={styles.disclosureHistoryItem}>
                            <div>
                                <strong><FileText size={14} /> {document.title}</strong>
                                <span>{document.version} · {document.brandName || '브랜드 미지정'} · {document.franchisorName || '가맹본부 미지정'}</span>
                                {document.fileUrl ? (
                                    <a className={styles.disclosureFileLink} href={document.fileUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink size={13} />
                                        문서 열기
                                    </a>
                                ) : null}
                            </div>
                            <div className={styles.disclosureActionRow}>
                                <button
                                    type="button"
                                    className={selectedDocumentId === document.id ? styles.secondaryButtonSuccess : styles.secondaryButton}
                                    onClick={() => onSelectDocument(document.id)}
                                    disabled={deletingDocumentId === document.id}
                                >
                                    {selectedDocumentId === document.id ? '선택됨' : '발송 문서로 선택'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.iconDangerButton}
                                    onClick={() => void handleDeleteDocument(document)}
                                    disabled={deletingDocumentId === document.id}
                                    aria-label={`${document.title} 삭제`}
                                    title="문서 삭제"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>

                <div className={styles.modalActions}>
                    <button type="button" className={styles.secondaryButton} onClick={onClose}>닫기</button>
                </div>
            </div>
        </div>
    );
}
