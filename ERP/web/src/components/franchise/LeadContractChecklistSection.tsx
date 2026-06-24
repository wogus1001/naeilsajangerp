"use client";

import React from 'react';
import {
    CheckCircle2,
    Clock3,
    ExternalLink,
    FileCheck2,
    FilePlus2,
    FileUp,
    Link2,
    ListChecks,
    Trash2,
    X
} from 'lucide-react';
import type {
    LeadContractApplicability,
    LeadContractChecklistDocumentItem,
    LeadContractChecklistStep,
    LeadContractRequirementType
} from '@/lib/franchise-lead-contract-checklist';
import { buildLeadDocumentStoragePrefix } from '@/lib/franchise-lead-document-storage';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import { useLeadContractChecklist } from './useLeadContractChecklist';
import styles from './LeadContractChecklistSection.module.css';

type Props = {
    readonly companyId: string;
    readonly leadId: string;
    readonly onDocumentChanged?: () => void;
    readonly onSaved?: () => void;
    readonly refreshKey?: number;
    readonly userId: string;
};

type QuickDocumentMode = 'upload' | 'electronic_contract';

type QuickDocumentDraft = {
    readonly stepKey: string;
    readonly mode: QuickDocumentMode;
    readonly electronicContractId: string;
    readonly title: string;
    readonly memo: string;
    readonly file: File | null;
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

const UPLOAD_BUCKET = 'property-documents';

const CHECKLIST_GROUPS = [
    {
        requirementType: 'required',
        label: '필수',
        title: '계약 전 필수 서류',
        description: '미완료 또는 문서 누락 시 계약 진행을 막습니다.',
        summary: '계약 가능 게이트'
    },
    {
        requirementType: 'report',
        label: '내부보고',
        title: '내부 보고/승인 서류',
        description: '계약 차단은 아니지만 대표 보고와 오픈 준비 리스크를 표시합니다.',
        summary: '미완료 시 경고'
    },
    {
        requirementType: 'optional',
        label: '선택',
        title: '선택 보관 서류',
        description: '상황에 따라 받거나 해당없음 사유로 정리합니다.',
        summary: '관리 편의'
    }
] as const satisfies readonly {
    readonly requirementType: LeadContractRequirementType;
    readonly label: string;
    readonly title: string;
    readonly description: string;
    readonly summary: string;
}[];

function formatChecklistDate(value: string): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hour = String(parsed.getHours()).padStart(2, '0');
    const minute = String(parsed.getMinutes()).padStart(2, '0');
    return `${month}.${day} ${hour}:${minute}`;
}

function sanitizePathPart(value: string): string {
    return value
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'document';
}

function summaryCardClass(requirementType: LeadContractRequirementType): string {
    switch (requirementType) {
        case 'required':
            return styles.requiredSummary;
        case 'report':
            return styles.reportSummary;
        case 'optional':
            return styles.optionalSummary;
    }
}

function documentText(step: LeadContractChecklistStep): string {
    if (step.documentSummary.count > 0) {
        return `${step.documentSummary.count}건 연결`;
    }
    return '문서 연결';
}

function readApplicabilityOption(value: string): LeadContractApplicability {
    return value === 'not_applicable' ? 'not_applicable' : 'applicable';
}

function groupSteps(
    steps: readonly LeadContractChecklistStep[],
    requirementType: LeadContractRequirementType
): readonly LeadContractChecklistStep[] {
    return steps.filter(step => step.requirementType === requirementType);
}

function createQuickDraft(step: LeadContractChecklistStep, mode: QuickDocumentMode): QuickDocumentDraft {
    return {
        stepKey: step.stepKey,
        mode,
        electronicContractId: '',
        title: step.documentSummary.latestTitle || step.label,
        memo: '',
        file: null
    };
}

function electronicContractLabel(contract: ElectronicContractOption): string {
    const status = contract.status === 'completed'
        ? '서명 완료'
        : contract.status === 'sent'
            ? '서명 대기'
            : contract.status || '상태 없음';
    return `${contract.name || '전자계약'} · ${status}`;
}

function documentUploaderText(document: LeadContractChecklistDocumentItem): string {
    return document.createdByName || document.createdBy || '담당자 미확인';
}

function electronicContractHref(document: LeadContractChecklistDocumentItem): string {
    if (document.sourceType === 'electronic_contract' && document.sourceId) {
        return `/contracts/electronic?contractId=${encodeURIComponent(document.sourceId)}`;
    }
    return '';
}

export function LeadContractChecklistSection({
    companyId,
    leadId,
    onDocumentChanged,
    onSaved,
    refreshKey,
    userId
}: Props) {
    const {
        errorMessage,
        fetchChecklist,
        isLoading,
        message,
        saveStep,
        savingStepKey,
        steps,
        summary
    } = useLeadContractChecklist({ leadId, onSaved, userId });
    const [electronicContracts, setElectronicContracts] = React.useState<readonly ElectronicContractOption[]>([]);
    const [quickDraft, setQuickDraft] = React.useState<QuickDocumentDraft | null>(null);
    const [quickSavingStepKey, setQuickSavingStepKey] = React.useState('');
    const [documentMessage, setDocumentMessage] = React.useState('');
    const [documentErrorMessage, setDocumentErrorMessage] = React.useState('');
    const activeDocumentStep = quickDraft
        ? steps.find(step => step.stepKey === quickDraft.stepKey) || null
        : null;

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

    React.useEffect(() => {
        const timeoutId = window.setTimeout(() => void fetchElectronicContracts(), 0);
        return () => window.clearTimeout(timeoutId);
    }, [fetchElectronicContracts]);

    React.useEffect(() => {
        if (refreshKey === undefined) return;
        const timeoutId = window.setTimeout(() => {
            void fetchChecklist();
            void fetchElectronicContracts();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [fetchChecklist, fetchElectronicContracts, refreshKey]);

    const saveApplicability = (
        step: LeadContractChecklistStep,
        applicability: LeadContractApplicability
    ) => {
        void saveStep(step.stepKey, {
            applicability,
            memo: step.memo
        });
    };

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
        formData.append(
            'path',
            `${storagePrefix}${Date.now()}-${suffix}-${fileName}`
        );

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

    const openUploadedDocument = async (documentId: string) => {
        if (!documentId) return;
        setDocumentMessage('');
        setDocumentErrorMessage('');
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
            setDocumentErrorMessage(error instanceof Error ? error.message : '문서를 열지 못했습니다.');
        }
    };

    const saveQuickDocument = async () => {
        if (!quickDraft) return;
        const title = quickDraft.title.trim();
        if (!title) {
            setDocumentErrorMessage('문서명을 입력해주세요.');
            return;
        }
        if (quickDraft.mode === 'upload' && !quickDraft.file) {
            setDocumentErrorMessage('업로드할 파일을 선택해주세요.');
            return;
        }
        if (quickDraft.mode === 'electronic_contract' && !quickDraft.electronicContractId) {
            setDocumentErrorMessage('연결할 전자계약 문서를 선택해주세요.');
            return;
        }

        setQuickSavingStepKey(quickDraft.stepKey);
        setDocumentMessage('');
        setDocumentErrorMessage('');
        try {
            const uploadResult = quickDraft.mode === 'upload' && quickDraft.file
                ? await uploadFile(quickDraft.file)
                : null;
            const selectedContract = electronicContracts.find(contract => contract.id === quickDraft.electronicContractId);
            const response = await fetch('/api/franchise-lead-documents', {
                method: 'POST',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    leadId,
                    title: quickDraft.mode === 'electronic_contract' ? selectedContract?.name || title : title,
                    sourceType: quickDraft.mode,
                    sourceId: quickDraft.mode === 'electronic_contract' ? quickDraft.electronicContractId : '',
                    documentStatus: 'stored',
                    fileName: quickDraft.file?.name || '',
                    storageBucket: uploadResult ? UPLOAD_BUCKET : '',
                    storagePath: uploadResult?.path || '',
                    memo: quickDraft.memo,
                    checklistStepKey: quickDraft.stepKey
                })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            setQuickDraft(null);
            setDocumentMessage('연결 문서를 등록했습니다.');
            await fetchChecklist();
            onDocumentChanged?.();
        } catch (error) {
            setDocumentErrorMessage(error instanceof Error ? error.message : '연결 문서를 등록하지 못했습니다.');
        } finally {
            setQuickSavingStepKey('');
        }
    };

    const deleteDocument = async (documentId: string, stepKey: string) => {
        if (!documentId || !stepKey) return;
        setQuickSavingStepKey(stepKey);
        setDocumentMessage('');
        setDocumentErrorMessage('');
        try {
            const params = new URLSearchParams({ id: documentId });
            const response = await fetch(`/api/franchise-lead-documents?${params.toString()}`, {
                method: 'DELETE',
                headers: await getApiAuthHeaders()
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            setDocumentMessage('문서를 삭제했습니다.');
            await fetchChecklist();
            onDocumentChanged?.();
        } catch (error) {
            setDocumentErrorMessage(error instanceof Error ? error.message : '문서를 삭제하지 못했습니다.');
        } finally {
            setQuickSavingStepKey('');
        }
    };

    return (
        <section className={styles.section}>
            <div className={styles.header}>
                <div>
                    <h3><ListChecks size={16} /> 구비서류 체크리스트</h3>
                    <p>필수는 계약 가능 게이트, 내부보고는 경고, 선택은 관리 편의 항목입니다.</p>
                </div>
                <span className={summary.missingRequiredCount > 0 ? styles.blockingPill : styles.readyPill}>
                    필수 {summary.groups.required.resolved}/{summary.groups.required.total}
                </span>
            </div>

            <div className={styles.summaryGrid}>
                {CHECKLIST_GROUPS.map(group => {
                    const groupSummary = summary.groups[group.requirementType];
                    return (
                        <div key={group.requirementType} className={`${styles.summaryCard} ${summaryCardClass(group.requirementType)}`}>
                            <span>{group.label}</span>
                            <strong>{groupSummary.resolved}/{groupSummary.total}</strong>
                            <small>{group.requirementType === 'required' ? `문서 누락 ${summary.missingRequiredCount}건` : group.summary}</small>
                        </div>
                    );
                })}
            </div>

            <div className={styles.progress} aria-label={`필수 구비서류 체크리스트 진행률 ${summary.groups.required.progressPercent}%`}>
                <span style={{ width: `${summary.groups.required.progressPercent}%` }} />
            </div>

            {errorMessage && <div className={styles.error}>{errorMessage}</div>}
            {message && <div className={styles.message}>{message}</div>}
            {documentErrorMessage && <div className={styles.error}>{documentErrorMessage}</div>}
            {documentMessage && <div className={styles.message}>{documentMessage}</div>}

            <div className={styles.groupList}>
                {isLoading && steps.length === 0 ? (
                    <div className={styles.empty}>체크리스트를 불러오는 중입니다.</div>
                ) : CHECKLIST_GROUPS.map(group => {
                    const groupedSteps = groupSteps(steps, group.requirementType);
                    const groupSummary = summary.groups[group.requirementType];
                    return (
                        <section key={group.requirementType} className={`${styles.groupSection} ${styles[`${group.requirementType}Group`]}`}>
                            <div className={styles.groupHeader}>
                                <div className={styles.groupHeaderText}>
                                    <span>{group.label}</span>
                                    <strong>{group.title}</strong>
                                    <small>{group.description}</small>
                                </div>
                                <em>{groupSummary.resolved}/{groupSummary.total}</em>
                            </div>

                            <div className={styles.table}>
                                {groupedSteps.map(step => {
                                    const isSaving = savingStepKey === step.stepKey;
                                    const isQuickSaving = quickSavingStepKey === step.stepKey;
                                    const completedAt = formatChecklistDate(step.completedAt);
                                    const isNotApplicable = step.applicability === 'not_applicable';
                                    const hasLinkedDocument = step.documentSummary.count > 0;
                                    return (
                                        <article
                                            key={step.stepKey}
                                            className={`${styles.row} ${step.resolved ? styles.resolvedRow : ''}`}
                                        >
                                            <div className={styles.documentInfo}>
                                                <button
                                                    type="button"
                                                    className={step.completed ? styles.completeButtonDone : styles.completeButton}
                                                    onClick={() => void saveStep(step.stepKey, {
                                                        completed: !step.completed,
                                                        applicability: 'applicable',
                                                        memo: step.memo
                                                    })}
                                                    disabled={isSaving}
                                                >
                                                    {step.completed ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                                                    <span>{step.completed ? '완료됨' : '완료'}</span>
                                                    {step.completed && completedAt && <small>{completedAt}</small>}
                                                    {!step.completed && isNotApplicable && <small>해당없음</small>}
                                                </button>

                                                <div className={styles.titleCell}>
                                                    <strong>{step.label}</strong>
                                                    <span>{step.basisText}</span>
                                                </div>
                                            </div>

                                            <div className={`${styles.statusPanel} ${hasLinkedDocument ? '' : styles.statusPanelNoDocument}`}>
                                                <div className={styles.rowControls}>
                                                    <label className={styles.applicabilityControl}>
                                                        해당 여부
                                                        <select
                                                            className={styles.select}
                                                            value={step.applicability}
                                                            disabled={isSaving}
                                                            onChange={(event) => saveApplicability(step, readApplicabilityOption(event.target.value))}
                                                        >
                                                            <option value="applicable">해당</option>
                                                            <option value="not_applicable">해당없음</option>
                                                        </select>
                                                    </label>
                                                    <div className={styles.documentActions}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setQuickDraft(createQuickDraft(step, 'upload'))}
                                                            disabled={isSaving || isQuickSaving}
                                                        >
                                                            <FileUp size={14} />
                                                            업로드
                                                        </button>
                                                    </div>
                                                </div>

                                                {hasLinkedDocument && (
                                                    <button
                                                        type="button"
                                                        className={`${styles.documentCell} ${styles.documentLinked}`}
                                                        onClick={() => setQuickDraft(createQuickDraft(step, 'upload'))}
                                                        disabled={isSaving || isQuickSaving}
                                                    >
                                                        <FileCheck2 size={16} />
                                                        <strong>{documentText(step)}</strong>
                                                    </button>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            {quickDraft && activeDocumentStep && (
                <div className={styles.documentModalBackdrop} onClick={() => setQuickDraft(null)}>
                    <section
                        className={styles.documentModal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="lead-checklist-document-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className={styles.documentModalHeader}>
                            <div>
                                <span>연결 문서 관리</span>
                                <h4 id="lead-checklist-document-modal-title">{activeDocumentStep.label}</h4>
                                <p>{activeDocumentStep.basisText}</p>
                            </div>
                            <button type="button" aria-label="닫기" onClick={() => setQuickDraft(null)} disabled={quickSavingStepKey === activeDocumentStep.stepKey}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className={styles.documentModalLinked}>
                            <strong>연결된 문서 · {documentText(activeDocumentStep)}</strong>
                            {activeDocumentStep.documentSummary.count > 0 ? (
                                <div className={styles.documentModalLinkedBody}>
                                    {activeDocumentStep.documentSummary.documents.length > 0 ? (
                                        activeDocumentStep.documentSummary.documents.map(document => {
                                            const href = electronicContractHref(document);
                                            return (
                                                <div key={document.id} className={styles.linkedDocumentItem}>
                                                    <div>
                                                        <strong>{document.title}</strong>
                                                        <span>올림 담당자 · {documentUploaderText(document)}</span>
                                                    </div>
                                                    <div className={styles.linkedDocumentActions}>
                                                        {document.sourceType === 'upload' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => void openUploadedDocument(document.id)}
                                                                disabled={quickSavingStepKey === activeDocumentStep.stepKey}
                                                            >
                                                                <ExternalLink size={13} />
                                                                열기
                                                            </button>
                                                        ) : href ? (
                                                            <a href={href} target="_blank" rel="noreferrer">
                                                                <ExternalLink size={13} />
                                                                열기
                                                            </a>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={() => void deleteDocument(document.id, activeDocumentStep.stepKey)}
                                                            disabled={quickSavingStepKey === activeDocumentStep.stepKey}
                                                        >
                                                            <Trash2 size={13} />
                                                            문서 삭제
                                                        </button>
                                                    </div>
                                                    <p className={document.memo ? '' : styles.documentEmptyMemo}>
                                                        {document.memo || '문서 메모 없음'}
                                                    </p>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className={styles.linkedDocumentItem}>
                                            <div>
                                                <strong>{activeDocumentStep.documentSummary.latestTitle || '점주 문서'}</strong>
                                                <span>올림 담당자 · {activeDocumentStep.documentSummary.latestCreatedByName || activeDocumentStep.documentSummary.latestCreatedBy || '담당자 미확인'}</span>
                                            </div>
                                            <p className={activeDocumentStep.documentSummary.latestMemo ? '' : styles.documentEmptyMemo}>
                                                {activeDocumentStep.documentSummary.latestMemo || '문서 메모 없음'}
                                            </p>
                                            <div className={styles.linkedDocumentRemoveList}>
                                                {activeDocumentStep.documentSummary.documentIds.map(documentId => (
                                                    <button
                                                        key={documentId}
                                                        type="button"
                                                        onClick={() => void deleteDocument(documentId, activeDocumentStep.stepKey)}
                                                        disabled={quickSavingStepKey === activeDocumentStep.stepKey}
                                                    >
                                                        <Trash2 size={13} />
                                                        문서 삭제
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p>아직 연결된 문서가 없습니다.</p>
                            )}
                        </div>

                        <div className={styles.documentModeTabs} aria-label="문서 연결 방식">
                            <button
                                type="button"
                                className={quickDraft.mode === 'upload' ? styles.documentModeTabActive : styles.documentModeTab}
                                onClick={() => setQuickDraft({ ...quickDraft, mode: 'upload' })}
                                disabled={quickSavingStepKey === activeDocumentStep.stepKey}
                            >
                                <FileUp size={14} />
                                업로드
                            </button>
                            <button
                                type="button"
                                className={quickDraft.mode === 'electronic_contract' ? styles.documentModeTabActive : styles.documentModeTab}
                                onClick={() => setQuickDraft({ ...quickDraft, mode: 'electronic_contract' })}
                                disabled={quickSavingStepKey === activeDocumentStep.stepKey}
                            >
                                <Link2 size={14} />
                                전자계약
                            </button>
                        </div>

                        <div className={styles.quickDocumentForm}>
                            <label>
                                문서명
                                <input
                                    value={quickDraft.title}
                                    onChange={(event) => setQuickDraft({ ...quickDraft, title: event.target.value })}
                                    disabled={quickSavingStepKey === activeDocumentStep.stepKey}
                                />
                            </label>
                            {quickDraft.mode === 'upload' ? (
                                <label>
                                    파일
                                    <input
                                        type="file"
                                        onChange={(event) => setQuickDraft({ ...quickDraft, file: event.target.files?.[0] || null })}
                                        disabled={quickSavingStepKey === activeDocumentStep.stepKey}
                                    />
                                </label>
                            ) : (
                                <label>
                                    전자계약 문서
                                    <select
                                        value={quickDraft.electronicContractId}
                                        onChange={(event) => setQuickDraft({ ...quickDraft, electronicContractId: event.target.value })}
                                        disabled={quickSavingStepKey === activeDocumentStep.stepKey}
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
                            <label>
                                문서 메모
                                <input
                                    value={quickDraft.memo}
                                    onChange={(event) => setQuickDraft({ ...quickDraft, memo: event.target.value })}
                                    placeholder="문서 확인 내용"
                                    disabled={quickSavingStepKey === activeDocumentStep.stepKey}
                                />
                            </label>
                            <button type="button" onClick={() => void saveQuickDocument()} disabled={quickSavingStepKey === activeDocumentStep.stepKey}>
                                <FilePlus2 size={14} />
                                {quickSavingStepKey === activeDocumentStep.stepKey ? '등록 중' : '문서 등록'}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}
