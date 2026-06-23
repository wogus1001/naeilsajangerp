"use client";

import React from 'react';
import {
    CheckCircle2,
    Clock3,
    FileCheck2,
    FilePlus2,
    FileText,
    FileUp,
    Link2,
    ListChecks,
    Save,
    X
} from 'lucide-react';
import type {
    LeadContractApplicability,
    LeadContractBasisType,
    LeadContractChecklistStep,
    LeadContractRequirementType
} from '@/lib/franchise-lead-contract-checklist';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import { readApiError, unwrapApiData } from '@/utils/apiResponse';
import { useLeadContractChecklist } from './useLeadContractChecklist';
import styles from './LeadContractChecklistSection.module.css';

type Props = {
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
    readonly publicUrl?: string;
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

const BASIS_LABELS: Record<LeadContractBasisType, string> = {
    franchise_law: '가맹사업법상',
    privacy: '개인정보',
    internal: '운영필수'
};

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

function basisClass(basisType: LeadContractBasisType): string {
    switch (basisType) {
        case 'franchise_law':
            return styles.lawBadge;
        case 'privacy':
            return styles.privacyBadge;
        case 'internal':
            return styles.internalBadge;
    }
}

function documentText(step: LeadContractChecklistStep): string {
    if (step.documentSummary.count > 0) {
        return `${step.documentSummary.count}건 연결`;
    }
    return step.requiredEvidence ? '문서 필요' : '문서 없음';
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

export function LeadContractChecklistSection({
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
    const [memoDrafts, setMemoDrafts] = React.useState<Record<string, string>>({});
    const [quickDraft, setQuickDraft] = React.useState<QuickDocumentDraft | null>(null);
    const [quickSavingStepKey, setQuickSavingStepKey] = React.useState('');
    const [documentMessage, setDocumentMessage] = React.useState('');
    const [documentErrorMessage, setDocumentErrorMessage] = React.useState('');

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

    const memoDraftKey = React.useCallback((stepKey: string) => `${leadId}:${stepKey}`, [leadId]);

    const readStepMemo = React.useCallback((step: LeadContractChecklistStep) => (
        memoDrafts[memoDraftKey(step.stepKey)] ?? step.memo
    ), [memoDraftKey, memoDrafts]);

    const updateMemoDraft = (stepKey: string, memo: string) => {
        setMemoDrafts(prev => ({ ...prev, [memoDraftKey(stepKey)]: memo }));
    };

    const saveApplicability = (
        step: LeadContractChecklistStep,
        applicability: LeadContractApplicability
    ) => {
        void saveStep(step.stepKey, {
            applicability,
            memo: readStepMemo(step)
        });
    };

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        const suffix = Math.random().toString(36).slice(2, 10) || 'upload';
        const fileName = sanitizePathPart(file.name);
        formData.append('file', file);
        formData.append('bucket', UPLOAD_BUCKET);
        formData.append(
            'path',
            `franchise-lead-documents/${sanitizePathPart(leadId)}/${Date.now()}-${suffix}-${fileName}`
        );

        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        const payload = await response.json();
        if (!response.ok) throw new Error(readApiError(payload));
        const data = unwrapApiData<UploadResponse>(payload);
        if (!data.publicUrl) throw new Error('업로드 URL을 확인할 수 없습니다.');
        return data.publicUrl;
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
            const fileUrl = quickDraft.mode === 'upload' && quickDraft.file
                ? await uploadFile(quickDraft.file)
                : '';
            const selectedContract = electronicContracts.find(contract => contract.id === quickDraft.electronicContractId);
            const response = await fetch('/api/franchise-lead-documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requesterId: userId,
                    leadId,
                    title: quickDraft.mode === 'electronic_contract' ? selectedContract?.name || title : title,
                    sourceType: quickDraft.mode,
                    sourceId: quickDraft.mode === 'electronic_contract' ? quickDraft.electronicContractId : '',
                    documentStatus: 'stored',
                    fileUrl,
                    fileName: quickDraft.file?.name || '',
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

    const unlinkDocument = async (documentId: string, stepKey: string) => {
        if (!documentId || !stepKey) return;
        setQuickSavingStepKey(stepKey);
        setDocumentMessage('');
        setDocumentErrorMessage('');
        try {
            const params = new URLSearchParams({
                requesterId: userId,
                id: documentId,
                checklistStepKey: stepKey
            });
            const response = await fetch(`/api/franchise-lead-documents?${params.toString()}`, { method: 'DELETE' });
            const payload = await response.json();
            if (!response.ok) throw new Error(readApiError(payload));
            setDocumentMessage('연결 문서를 해제했습니다.');
            await fetchChecklist();
            onDocumentChanged?.();
        } catch (error) {
            setDocumentErrorMessage(error instanceof Error ? error.message : '연결 문서를 해제하지 못했습니다.');
        } finally {
            setQuickSavingStepKey('');
        }
    };

    return (
        <section className={styles.section}>
            <div className={styles.header}>
                <div>
                    <h3><ListChecks size={16} /> 계약 전 체크</h3>
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

            <div className={styles.progress} aria-label={`필수 계약 전 체크 진행률 ${summary.groups.required.progressPercent}%`}>
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
                                <div>
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
                                    const activeQuickDraft = quickDraft?.stepKey === step.stepKey ? quickDraft : null;
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
                                                        memo: readStepMemo(step)
                                                    })}
                                                    disabled={isSaving}
                                                >
                                                    {step.completed ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                                                    <span>{step.completed ? '완료됨' : '완료 처리'}</span>
                                                    {step.completed && completedAt && <small>{completedAt}</small>}
                                                    {!step.completed && isNotApplicable && <small>해당없음</small>}
                                                </button>

                                                <div className={styles.titleCell}>
                                                    <strong>{step.label}</strong>
                                                    <span>{step.basisText}</span>
                                                    <div className={styles.metaGrid}>
                                                        <label>
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
                                                        <div>
                                                            근거
                                                            <span className={`${styles.badge} ${basisClass(step.basisType)}`}>
                                                                {BASIS_LABELS[step.basisType]}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            제출담당
                                                            <span className={styles.ownerCell}>{step.ownerTeam}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={styles.statusPanel}>
                                                <div className={`${styles.documentCell} ${step.documentSummary.count > 0 ? styles.documentLinked : ''}`}>
                                                    {step.documentSummary.count > 0 ? <FileCheck2 size={16} /> : <FileText size={16} />}
                                                    <div>
                                                        <strong>{documentText(step)}</strong>
                                                        <span>{step.documentSummary.latestTitle || '체크 항목에 문서를 연결해주세요.'}</span>
                                                    </div>
                                                </div>

                                                <div className={styles.documentActions}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuickDraft(createQuickDraft(step, 'upload'))}
                                                        disabled={isSaving || isQuickSaving}
                                                    >
                                                        <FileUp size={14} />
                                                        수기 등록
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuickDraft(createQuickDraft(step, 'electronic_contract'))}
                                                        disabled={isSaving || isQuickSaving}
                                                    >
                                                        <Link2 size={14} />
                                                        전자계약 연결
                                                    </button>
                                                </div>

                                                {activeQuickDraft && (
                                                    <div className={styles.quickDocumentForm}>
                                                        <div className={styles.quickDocumentHeader}>
                                                            <strong>{activeQuickDraft.mode === 'upload' ? '수기 등록' : '전자계약 연결'}</strong>
                                                            <button type="button" onClick={() => setQuickDraft(null)} disabled={isQuickSaving}>
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <label>
                                                            문서명
                                                            <input
                                                                value={activeQuickDraft.title}
                                                                onChange={(event) => setQuickDraft({ ...activeQuickDraft, title: event.target.value })}
                                                                disabled={isQuickSaving}
                                                            />
                                                        </label>
                                                        {activeQuickDraft.mode === 'upload' ? (
                                                            <label>
                                                                파일
                                                                <input
                                                                    type="file"
                                                                    onChange={(event) => setQuickDraft({ ...activeQuickDraft, file: event.target.files?.[0] || null })}
                                                                    disabled={isQuickSaving}
                                                                />
                                                            </label>
                                                        ) : (
                                                            <label>
                                                                전자계약 문서
                                                                <select
                                                                    value={activeQuickDraft.electronicContractId}
                                                                    onChange={(event) => setQuickDraft({ ...activeQuickDraft, electronicContractId: event.target.value })}
                                                                    disabled={isQuickSaving}
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
                                                            메모
                                                            <input
                                                                value={activeQuickDraft.memo}
                                                                onChange={(event) => setQuickDraft({ ...activeQuickDraft, memo: event.target.value })}
                                                                placeholder="문서 확인 내용"
                                                                disabled={isQuickSaving}
                                                            />
                                                        </label>
                                                        <button type="button" onClick={() => void saveQuickDocument()} disabled={isQuickSaving}>
                                                            <FilePlus2 size={14} />
                                                            {isQuickSaving ? '등록 중' : '등록'}
                                                        </button>
                                                    </div>
                                                )}

                                                {step.documentSummary.documentIds.length > 0 && (
                                                    <div className={styles.linkedDocumentRemoveList}>
                                                        {step.documentSummary.documentIds.map((documentId, index) => (
                                                            <button
                                                                key={documentId}
                                                                type="button"
                                                                onClick={() => void unlinkDocument(documentId, step.stepKey)}
                                                                disabled={isSaving || isQuickSaving}
                                                            >
                                                                <X size={13} />
                                                                {step.documentSummary.documentIds.length === 1 ? '연결 해제' : `${index + 1}번 연결 해제`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className={styles.memoCell}>
                                                    <input
                                                        value={readStepMemo(step)}
                                                        onChange={(event) => updateMemoDraft(step.stepKey, event.target.value)}
                                                        placeholder={isNotApplicable ? '해당없음 사유' : '메모'}
                                                        disabled={isSaving}
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`${step.label} 메모 저장`}
                                                        title="메모 저장"
                                                        onClick={() => void saveStep(step.stepKey, { memo: readStepMemo(step) })}
                                                        disabled={isSaving}
                                                    >
                                                        <Save size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </section>
    );
}
