'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FilePenLine, Save, Send } from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { ApprovalAttachments } from './ApprovalAttachments';
import {
    deleteApprovalAttachment,
    fetchApprovalDocument,
    fetchApprovalOrganization,
    fetchApprovalTemplates,
    saveApprovalDocument
} from './approvalApi';
import { ApprovalFieldRenderer } from './ApprovalFieldRenderer';
import { ApprovalLineSelector } from './ApprovalLineSelector';
import { ApprovalPageHeader } from './ApprovalPageHeader';
import { ApprovalRecipientsPanel } from './ApprovalRecipientsPanel';
import { approvalCategoryLabel } from './approvalLabels';
import { ApprovalTemplatePicker } from './ApprovalTemplatePicker';
import type {
    ApprovalAttachment,
    ApprovalFieldValue,
    ApprovalFieldValues,
    ApprovalLineSelections,
    ApprovalOrganization,
    ApprovalTemplate
} from './approvalTypes';
import { hasApprovalValue } from './approvalValidation';
import { approvalDocumentHref } from './approvalsNavigation';
import { ApprovalWriteMeta, type ApprovalWriteMetaValue } from './ApprovalWriteMeta';
import styles from './ApprovalDocument.module.css';

const INITIAL_META: ApprovalWriteMetaValue = {
    retentionPeriod: '5y',
    securityLevel: 'normal',
    documentBox: 'general'
};

type ResultModal = {
    readonly message: string;
    readonly title: string;
    readonly type: 'success' | 'error';
};

type ApprovalWritePageProps = { readonly documentId?: string };
type WriteStage = 'template' | 'document';

export function ApprovalWritePage({ documentId = '' }: ApprovalWritePageProps) {
    const router = useRouter();
    const [templates, setTemplates] = React.useState<readonly ApprovalTemplate[]>([]);
    const [templateId, setTemplateId] = React.useState('');
    const [title, setTitle] = React.useState('');
    const [values, setValues] = React.useState<ApprovalFieldValues>({});
    const [meta, setMeta] = React.useState<ApprovalWriteMetaValue>(INITIAL_META);
    const [files, setFiles] = React.useState<readonly File[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [confirmSubmit, setConfirmSubmit] = React.useState(false);
    const [resultModal, setResultModal] = React.useState<ResultModal | null>(null);
    const [savedDocumentId, setSavedDocumentId] = React.useState('');
    const [existingAttachments, setExistingAttachments] = React.useState<readonly ApprovalAttachment[]>([]);
    const [deletingAttachmentId, setDeletingAttachmentId] = React.useState('');
    const [organization, setOrganization] = React.useState<ApprovalOrganization | null>(null);
    const [readerProfileIds, setReaderProfileIds] = React.useState<readonly string[]>([]);
    const [approvalLineSelections, setApprovalLineSelections] = React.useState<ApprovalLineSelections>({});
    const [receiverUnitIds, setReceiverUnitIds] = React.useState<readonly string[]>([]);
    const [writeStage, setWriteStage] = React.useState<WriteStage>(documentId ? 'document' : 'template');
    const selectedTemplate = templates.find(template => template.id === templateId) ?? null;

    React.useEffect(() => {
        let active = true;
        Promise.all([
            fetchApprovalTemplates(false),
            documentId ? fetchApprovalDocument(documentId) : Promise.resolve(null),
            fetchApprovalOrganization()
        ])
            .then(([result, document, organizationResult]) => {
                if (!active) return;
                const documentTemplate = document && !result.some(template => template.id === document.templateId)
                    ? [{
                        id: document.templateId,
                        name: document.templateName,
                        description: '',
                        category: document.documentBox,
                        version: 0,
                        status: 'archived' as const,
                        fields: document.fields,
                        steps: document.templateSteps
                    }, ...result]
                    : result.map(template => document && template.id === document.templateId
                        ? { ...template, fields: document.fields, steps: document.templateSteps }
                        : template);
                setTemplates(documentTemplate);
                setTemplateId(document?.templateId || '');
                setOrganization(organizationResult);
                if (document) {
                    setTitle(document.title);
                    setValues(document.values);
                    setExistingAttachments(document.attachments);
                    setReaderProfileIds(document.readerProfileIds);
                    setApprovalLineSelections(document.approvalLineSelections);
                    setReceiverUnitIds(document.receiverUnitIds);
                    setMeta({
                        documentBox: document.documentBox,
                        retentionPeriod: document.retentionPeriod,
                        securityLevel: document.securityLevel === 'restricted' ? 'restricted' : document.securityLevel === 'confidential' ? 'confidential' : 'normal'
                    });
                }
            })
            .catch(caught => {
                if (active) setResultModal({
                    title: '양식을 불러오지 못했습니다',
                    message: caught instanceof Error ? caught.message : '전자결재 양식을 확인해 주세요.',
                    type: 'error'
                });
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [documentId]);

    function updateValue(fieldId: string, value: ApprovalFieldValue) {
        setValues(current => ({ ...current, [fieldId]: value }));
    }

    function selectTemplate(nextTemplateId: string) {
        if (nextTemplateId !== templateId) {
            setValues({});
            setFiles([]);
            setApprovalLineSelections({});
        }
        setTemplateId(nextTemplateId);
    }

    function validationMessage(action: 'saveDraft' | 'submit'): string {
        if (!selectedTemplate) return '사용할 결재 양식을 선택해 주세요.';
        if (action === 'saveDraft') return '';
        if (!title.trim()) return '문서 제목을 입력해 주세요.';
        const attachmentCount = existingAttachments.length + files.length;
        const missing = selectedTemplate.fields.find(field => field.required && (
            field.type === 'attachment' ? attachmentCount === 0 : !hasApprovalValue(values[field.id])
        ));
        return missing ? `${missing.label} 항목을 입력해 주세요.` : '';
    }

    async function removeExistingAttachment(attachment: ApprovalAttachment) {
        const activeDocumentId = documentId || savedDocumentId;
        if (!activeDocumentId || deletingAttachmentId) return;
        setDeletingAttachmentId(attachment.id);
        try {
            await deleteApprovalAttachment(activeDocumentId, attachment.id);
            setExistingAttachments(current => current.filter(item => item.id !== attachment.id));
        } catch (caught) {
            setResultModal({
                title: '첨부파일을 삭제하지 못했습니다',
                message: caught instanceof Error ? caught.message : '잠시 후 다시 시도해 주세요.',
                type: 'error'
            });
        } finally {
            setDeletingAttachmentId('');
        }
    }

    async function save(action: 'saveDraft' | 'submit') {
        const validation = validationMessage(action);
        if (validation) {
            setResultModal({ title: '입력 확인', message: validation, type: 'error' });
            return;
        }
        if (!selectedTemplate) return;
        setSaving(true);
        try {
            const document = await saveApprovalDocument({
                action,
                attachments: files,
                documentBox: meta.documentBox,
                fieldValues: values,
                retentionPeriod: meta.retentionPeriod,
                securityLevel: meta.securityLevel,
                templateId: selectedTemplate.id,
                title: title.trim() || `${selectedTemplate.name} 임시 문서`,
                documentId: documentId || savedDocumentId || undefined,
                readerProfileIds,
                receiverUnitIds,
                approvalLineSelections,
                onDocumentSaved: setSavedDocumentId,
                onAttachmentUploaded: (file, attachment) => {
                    setFiles(current => current.filter(item => item !== file));
                    setExistingAttachments(current => current.some(item => item.id === attachment.id)
                        ? current
                        : [...current, attachment]);
                }
            });
            setSavedDocumentId(document.id);
            setExistingAttachments(document.attachments);
            setFiles([]);
            setResultModal({
                title: action === 'submit' ? '결재를 요청했습니다' : '임시저장했습니다',
                message: action === 'submit' ? '첫 결재자에게 처리 요청이 전달됐습니다.' : '내 문서함에서 이어서 작성할 수 있습니다.',
                type: 'success'
            });
        } catch (caught) {
            setResultModal({
                title: '문서를 저장하지 못했습니다',
                message: caught instanceof Error ? caught.message : '잠시 후 다시 시도해 주세요.',
                type: 'error'
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className={styles.page}>
            <ApprovalPageHeader description={documentId ? '반려 사유를 확인하고 문서 내용을 수정합니다.' : '양식을 먼저 선택한 뒤 문서 내용을 작성하고 결재를 요청합니다.'} title={documentId ? '문서 수정' : '새 문서'} />
            {!documentId && writeStage === 'template' ? (
                <ApprovalTemplatePicker
                    loading={loading}
                    onContinue={() => setWriteStage('document')}
                    onSelect={selectTemplate}
                    selectedId={templateId}
                    templates={templates}
                />
            ) : (
            <div className={styles.writeLayout}>
                <div className={styles.documentPanel}>
                    <div className={styles.documentHeading}>
                        <FilePenLine size={20} aria-hidden="true" />
                        <div><strong>{documentId ? '문서 수정' : '2단계 · 문서 작성'}</strong><span>{selectedTemplate?.name || '양식 선택 필요'}</span></div>
                        {!documentId && <button className={styles.changeTemplateButton} onClick={() => setWriteStage('template')} type="button"><ArrowLeft size={15} />양식 다시 선택</button>}
                    </div>
                    <label className={styles.titleField}>
                        <span>문서 제목 <b>필수</b></span>
                        <input onChange={event => setTitle(event.target.value)} placeholder="업무 목적이 드러나는 제목을 입력하세요" value={title} />
                    </label>
                    {selectedTemplate && (
                        <ApprovalFieldRenderer
                            editable
                            fields={selectedTemplate.fields ?? []}
                            onAttachmentChange={selectedFiles => setFiles(current => [...current, ...selectedFiles].slice(0, 5))}
                            onChange={updateValue}
                            role="author"
                            values={values}
                        />
                    )}
                    {!loading && !selectedTemplate && (
                        <div className={styles.emptyDocument}>사용 중인 양식이 없습니다. 양식 관리에서 양식 사용을 시작해 주세요.</div>
                    )}
                    <ApprovalAttachments
                        deletingAttachmentId={deletingAttachmentId}
                        disabled={saving}
                        existing={existingAttachments}
                        files={files}
                        onChange={setFiles}
                        onDeleteExisting={attachment => void removeExistingAttachment(attachment)}
                    />
                </div>
                <aside className={styles.writeSidebar}>
                    <div className={styles.sidePanel}>
                        <h3>사용 양식</h3>
                        {selectedTemplate && <span className={styles.selectedTemplateSummary}>{approvalCategoryLabel(selectedTemplate.category)}<strong>{selectedTemplate.name}</strong></span>}
                        {selectedTemplate && <p>{selectedTemplate.description || '양식 설명이 없습니다.'}</p>}
                    </div>
                    <div className={styles.sidePanel}>
                        <h3>문서 설정</h3>
                        <ApprovalWriteMeta onChange={setMeta} value={meta} />
                    </div>
                    <ApprovalRecipientsPanel
                        onReceiverChange={setReceiverUnitIds}
                        organization={organization}
                        receiverUnitIds={receiverUnitIds}
                    />
                    <div className={styles.sidePanel}>
                        {selectedTemplate
                            ? <ApprovalLineSelector
                                onChange={setApprovalLineSelections}
                                onReaderChange={setReaderProfileIds}
                                organization={organization}
                                readerProfileIds={readerProfileIds}
                                selections={approvalLineSelections}
                                steps={selectedTemplate.steps ?? []}
                            />
                            : <p className={styles.emptyLine}>양식을 선택하면 결재선이 표시됩니다.</p>}
                    </div>
                    <div className={styles.actionBar}>
                        <button className={styles.secondaryButton} disabled={saving || !selectedTemplate} onClick={() => void save('saveDraft')} type="button">
                            <Save size={17} aria-hidden="true" /> 임시저장
                        </button>
                        <button className={styles.primaryButton} disabled={saving || !selectedTemplate} onClick={() => setConfirmSubmit(true)} type="button">
                            <Send size={17} aria-hidden="true" /> 결재 요청
                        </button>
                    </div>
                </aside>
            </div>
            )}
            <ConfirmModal
                confirmText="요청하기"
                isOpen={confirmSubmit}
                message="입력한 내용과 결재선을 확인했습니다. 결재 요청 후 첫 결재 단계가 시작됩니다."
                onClose={() => setConfirmSubmit(false)}
                onConfirm={() => void save('submit')}
                title="결재를 요청할까요?"
            />
            <AlertModal
                isOpen={resultModal !== null}
                message={resultModal?.message ?? ''}
                onClose={() => {
                    const shouldOpenDocument = resultModal?.type === 'success' && Boolean(savedDocumentId);
                    setResultModal(null);
                    if (shouldOpenDocument) router.push(approvalDocumentHref(savedDocumentId));
                }}
                title={resultModal?.title}
                type={resultModal?.type}
            />
        </section>
    );
}
