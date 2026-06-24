"use client";

import React from 'react';
import { ExternalLink, FileText, Link2, Trash2, UploadCloud, X } from 'lucide-react';
import { LEAD_CONTRACT_CHECKLIST_DEFINITIONS } from '@/lib/franchise-lead-contract-checklist';
import { buildLeadDocumentStoragePrefix } from '@/lib/franchise-lead-document-storage';
import type { FranchiseLeadDocument } from '@/lib/franchise-lead-documents';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import styles from './LeadDocumentBoxSection.module.css';

type Props = {
    readonly companyId: string;
    readonly leadId: string;
    readonly leadName: string;
    readonly onSaved?: () => void;
    readonly refreshKey?: number;
    readonly userId: string;
};

type LeadDocumentsResponse = {
    readonly documents?: readonly FranchiseLeadDocument[];
};

type UploadResponse = {
    readonly path?: string;
};

type OpenDocumentResponse = {
    readonly url?: string;
};

type ElectronicContractOption = {
    readonly id: string;
    readonly name: string;
    readonly status: string;
};

type ElectronicContractsResponse = {
    readonly contracts?: readonly ElectronicContractOption[];
};

type DocumentFormMode = 'upload' | 'electronic_contract';

const UPLOAD_BUCKET = 'property-documents';
const UNLINKED_CHECKLIST_STEP_KEY = '';

const CHECKLIST_LABELS = new Map<string, string>(
    LEAD_CONTRACT_CHECKLIST_DEFINITIONS.map(definition => [definition.stepKey, definition.label])
);

const FORM_MODES = [
    { mode: 'upload', label: '업로드', icon: UploadCloud },
    { mode: 'electronic_contract', label: '전자계약', icon: Link2 }
] as const;

function sanitizePathPart(value: string): string {
    return value
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'document';
}

function formatDate(value: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(parsed);
}

function sourceLabel(document: FranchiseLeadDocument): string {
    switch (document.sourceType) {
        case 'electronic_contract':
            return '전자계약';
        case 'upload':
            return '파일';
        case 'external_url':
            return '외부 URL';
        case 'disclosure':
            return '정보공개서';
        case 'manual':
            return '수기';
    }
}

function sourceBadgeClass(document: FranchiseLeadDocument): string {
    switch (document.sourceType) {
        case 'electronic_contract':
            return styles.electronicBadge;
        case 'upload':
            return styles.uploadBadge;
        case 'manual':
            return styles.manualBadge;
        default:
            return styles.defaultBadge;
    }
}

function checklistLabel(stepKey: string): string {
    return CHECKLIST_LABELS.get(stepKey) || stepKey;
}

function electronicContractLabel(contract: ElectronicContractOption): string {
    const status = contract.status === 'completed'
        ? '서명 완료'
        : contract.status === 'sent'
            ? '서명 대기'
            : contract.status || '상태 없음';
    return `${contract.name || '전자계약'} · ${status}`;
}

export function LeadDocumentBoxSection({
    leadId,
    companyId,
    leadName,
    onSaved,
    refreshKey
}: Props) {
    const [documents, setDocuments] = React.useState<readonly FranchiseLeadDocument[]>([]);
    const [electronicContracts, setElectronicContracts] = React.useState<readonly ElectronicContractOption[]>([]);
    const [formMode, setFormMode] = React.useState<DocumentFormMode>('upload');
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [title, setTitle] = React.useState('');
    const [memo, setMemo] = React.useState('');
    const [electronicContractId, setElectronicContractId] = React.useState('');
    const [checklistStepKey, setChecklistStepKey] = React.useState('owner-id-seal-certificate');
    const [linkDrafts, setLinkDrafts] = React.useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');

    const fetchElectronicContracts = React.useCallback(async () => {
        if (!leadId) return;
        try {
            const params = new URLSearchParams({ scope: 'company', leadId });
            const response = await fetch(`/api/electronic-contracts?${params.toString()}`, {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<ElectronicContractsResponse>(payload);
            setElectronicContracts((data.contracts || []).filter(contract => contract.status === 'completed'));
        } catch {
            setElectronicContracts([]);
        }
    }, [leadId]);

    const fetchDocuments = React.useCallback(async () => {
        if (!leadId) return;
        setIsLoading(true);
        setErrorMessage('');
        try {
            const params = new URLSearchParams({ leadId });
            const response = await fetch(`/api/franchise-lead-documents?${params.toString()}`, {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<LeadDocumentsResponse>(payload);
            setDocuments(data.documents || []);
        } catch (error) {
            setDocuments([]);
            setErrorMessage(error instanceof Error ? error.message : '점주 문서함을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [leadId]);

    React.useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchDocuments();
            void fetchElectronicContracts();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [fetchDocuments, fetchElectronicContracts]);

    React.useEffect(() => {
        if (refreshKey === undefined) return;
        const timeoutId = window.setTimeout(() => {
            void fetchDocuments();
            void fetchElectronicContracts();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [fetchDocuments, fetchElectronicContracts, refreshKey]);

    const uploadFile = async (file: File) => {
        if (!companyId) throw new Error('회사 정보를 확인할 수 없습니다.');
        const formData = new FormData();
        const suffix = Math.random().toString(36).slice(2, 10) || 'upload';
        const fileName = sanitizePathPart(file.name);
        const storagePrefix = buildLeadDocumentStoragePrefix({ companyId, leadId });
        formData.append('file', file);
        formData.append('bucket', UPLOAD_BUCKET);
        formData.append('companyId', companyId);
        formData.append('leadId', leadId);
        formData.append('path', `${storagePrefix}${Date.now()}-${suffix}-${fileName}`);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            headers: await getApiAuthHeaders()
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(readApiError(payload));
        const data = unwrapApiData<UploadResponse>(payload);
        if (!data.path) throw new Error('업로드 경로를 확인할 수 없습니다.');
        return data;
    };

    const resetForm = () => {
        setSelectedFile(null);
        setTitle('');
        setMemo('');
        setElectronicContractId('');
    };

    const saveDocument = async () => {
        const cleanTitle = title.trim();
        if (formMode === 'upload' && !selectedFile) {
            setErrorMessage('등록할 파일을 선택해주세요.');
            return;
        }
        if (formMode === 'electronic_contract' && !electronicContractId.trim()) {
            setErrorMessage('연결할 전자계약 문서를 선택해주세요.');
            return;
        }

        setIsSaving(true);
        setMessage('');
        setErrorMessage('');
        try {
            const uploadResult = formMode === 'upload' && selectedFile
                ? await uploadFile(selectedFile)
                : null;
            const selectedContract = electronicContracts.find(contract => contract.id === electronicContractId.trim());
            const response = await fetch('/api/franchise-lead-documents', {
                method: 'POST',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    leadId,
                    title: cleanTitle || selectedFile?.name || selectedContract?.name || '전자계약 문서',
                    sourceType: formMode,
                    sourceId: formMode === 'electronic_contract' ? electronicContractId.trim() : '',
                    documentStatus: 'stored',
                    fileName: selectedFile?.name || '',
                    storageBucket: uploadResult ? UPLOAD_BUCKET : '',
                    storagePath: uploadResult?.path || '',
                    memo,
                    checklistStepKey: checklistStepKey || undefined
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<LeadDocumentsResponse>(payload);
            setDocuments(data.documents || []);
            setLinkDrafts({});
            resetForm();
            setMessage('점주 문서함에 등록했습니다.');
            onSaved?.();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '점주 문서 등록에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const unlinkDocument = async (documentId: string, stepKey: string) => {
        if (!documentId || !stepKey) return;
        setIsSaving(true);
        setMessage('');
        setErrorMessage('');
        try {
            const params = new URLSearchParams({
                id: documentId,
                checklistStepKey: stepKey
            });
            const response = await fetch(`/api/franchise-lead-documents?${params.toString()}`, {
                method: 'DELETE',
                headers: await getApiAuthHeaders()
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<LeadDocumentsResponse>(payload);
            setDocuments(data.documents || []);
            setMessage('체크 항목 연결을 삭제했습니다.');
            onSaved?.();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '체크 항목 연결을 삭제하지 못했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const linkDocument = async (documentId: string, stepKey: string) => {
        if (!documentId || !stepKey) {
            setErrorMessage('연결할 체크 항목을 선택해주세요.');
            return;
        }
        setIsSaving(true);
        setMessage('');
        setErrorMessage('');
        try {
            const response = await fetch('/api/franchise-lead-documents', {
                method: 'PATCH',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    id: documentId,
                    checklistStepKey: stepKey
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<LeadDocumentsResponse>(payload);
            setDocuments(data.documents || []);
            setLinkDrafts(prev => {
                const next = { ...prev };
                delete next[documentId];
                return next;
            });
            setMessage('체크 항목에 연결했습니다.');
            onSaved?.();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '체크 항목에 연결하지 못했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteDocument = async (documentId: string) => {
        if (!documentId) return;
        setIsSaving(true);
        setMessage('');
        setErrorMessage('');
        try {
            const params = new URLSearchParams({ id: documentId });
            const response = await fetch(`/api/franchise-lead-documents?${params.toString()}`, {
                method: 'DELETE',
                headers: await getApiAuthHeaders()
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<LeadDocumentsResponse>(payload);
            setDocuments(data.documents || []);
            setMessage('문서를 삭제했습니다.');
            onSaved?.();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '문서를 삭제하지 못했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const openUploadedDocument = async (documentId: string) => {
        if (!documentId) return;
        setMessage('');
        setErrorMessage('');
        try {
            const params = new URLSearchParams({ action: 'open', documentId });
            const response = await fetch(`/api/franchise-lead-documents?${params.toString()}`, {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            const data = unwrapApiData<OpenDocumentResponse>(payload);
            if (!data.url) throw new Error('문서 열람 URL을 확인하지 못했습니다.');
            window.open(data.url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '문서를 열지 못했습니다.');
        }
    };

    return (
        <section className={styles.section}>
            <div className={styles.header}>
                <div>
                    <h3><FileText size={16} /> 점주 문서함</h3>
                    <p>{leadName} 후보자 단계의 문서를 계약·오픈 단계까지 이어서 관리합니다.</p>
                </div>
                <span>{documents.length}건</span>
            </div>

            <div className={styles.modeTabs} aria-label="문서 등록 방식">
                {FORM_MODES.map(({ mode, label, icon: Icon }) => (
                    <button
                        key={mode}
                        type="button"
                        className={formMode === mode ? styles.modeTabActive : styles.modeTab}
                        onClick={() => setFormMode(mode)}
                        disabled={isSaving}
                    >
                        <Icon size={15} />
                        {label}
                    </button>
                ))}
            </div>

            <div className={styles.form}>
                <label>
                    문서명
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder={selectedFile?.name || (formMode === 'electronic_contract' ? '전자계약 문서명' : '문서명을 입력하세요')}
                        disabled={isSaving}
                    />
                </label>
                <label>
                    연결 항목
                    <select
                        value={checklistStepKey}
                        onChange={(event) => setChecklistStepKey(event.target.value)}
                        disabled={isSaving}
                    >
                        {LEAD_CONTRACT_CHECKLIST_DEFINITIONS.map(definition => (
                            <option key={definition.stepKey} value={definition.stepKey}>
                                {definition.label}
                            </option>
                        ))}
                        <option value={UNLINKED_CHECKLIST_STEP_KEY}>기타(체크 항목 미연결)</option>
                    </select>
                </label>
                {formMode === 'upload' && (
                    <label className={styles.fileControl}>
                        파일
                        <input
                            type="file"
                            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                            disabled={isSaving}
                        />
                    </label>
                )}
                {formMode === 'electronic_contract' && (
                    <label>
                        전자계약 문서
                        <select
                            value={electronicContractId}
                            onChange={(event) => setElectronicContractId(event.target.value)}
                            disabled={isSaving}
                        >
                            <option value="">연결할 전자계약 선택</option>
                            {electronicContracts.length === 0 && (
                                <option value="" disabled>완료된 전자계약 문서가 없습니다</option>
                            )}
                            {electronicContracts.map(contract => (
                                <option key={contract.id} value={contract.id}>
                                    {electronicContractLabel(contract)}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <label className={styles.memoControl}>
                    메모
                    <input
                        value={memo}
                        onChange={(event) => setMemo(event.target.value)}
                        placeholder="문서 확인 내용"
                        disabled={isSaving}
                    />
                </label>
                <button type="button" onClick={() => void saveDocument()} disabled={isSaving}>
                    <UploadCloud size={16} />
                    {isSaving ? '등록 중' : '등록'}
                </button>
            </div>

            {errorMessage && <div className={styles.error}>{errorMessage}</div>}
            {message && <div className={styles.message}>{message}</div>}

            <div className={styles.list} aria-busy={isLoading}>
                {isLoading && documents.length === 0 ? (
                    <div className={styles.empty}>문서를 불러오는 중입니다.</div>
                ) : documents.length === 0 ? (
                    <div className={styles.empty}>아직 등록된 점주 문서가 없습니다.</div>
                ) : documents.map(document => (
                    <article key={document.id} className={styles.documentRow}>
                        <div className={styles.documentTitle}>
                            <div className={styles.documentTitleLine}>
                                <strong>{document.title}</strong>
                                <span className={`${styles.sourceBadge} ${sourceBadgeClass(document)}`}>{sourceLabel(document)}</span>
                            </div>
                            <span>{formatDate(document.updatedAt || document.createdAt) || '날짜 없음'}</span>
                        </div>
                        <div className={styles.linkedSteps}>
                            {document.checklistStepKeys.length > 0
                                ? document.checklistStepKeys.map(stepKey => (
                                    <button
                                        key={stepKey}
                                        type="button"
                                        onClick={() => void unlinkDocument(document.id, stepKey)}
                                        disabled={isSaving}
                                        title={`${checklistLabel(stepKey)} 연결 삭제`}
                                    >
                                        {checklistLabel(stepKey)}
                                        <X size={12} />
                                    </button>
                                ))
                                : (
                                    <div className={styles.relinkControl}>
                                        <span>체크 항목 미연결</span>
                                        <select
                                            value={linkDrafts[document.id] || ''}
                                            onChange={(event) => setLinkDrafts(prev => ({
                                                ...prev,
                                                [document.id]: event.target.value
                                            }))}
                                            disabled={isSaving}
                                        >
                                            <option value="">연결 항목 선택</option>
                                            {LEAD_CONTRACT_CHECKLIST_DEFINITIONS.map(definition => (
                                                <option key={definition.stepKey} value={definition.stepKey}>
                                                    {definition.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => void linkDocument(document.id, linkDrafts[document.id] || '')}
                                            disabled={isSaving || !linkDrafts[document.id]}
                                        >
                                            <Link2 size={12} />
                                            연결
                                        </button>
                                    </div>
                                )}
                        </div>
                        <div className={styles.documentActions}>
                            {document.sourceType === 'upload' ? (
                                <button type="button" onClick={() => void openUploadedDocument(document.id)} disabled={isSaving}>
                                    <ExternalLink size={15} />
                                    열기
                                </button>
                            ) : document.sourceType === 'electronic_contract' && document.sourceId ? (
                                <a href={`/contracts/electronic?contractId=${encodeURIComponent(document.sourceId)}`}>
                                    <ExternalLink size={15} />
                                    전자계약
                                </a>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => void deleteDocument(document.id)}
                                disabled={isSaving}
                                title="문서를 삭제합니다."
                            >
                                <Trash2 size={15} />
                                삭제
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
