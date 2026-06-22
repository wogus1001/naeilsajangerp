"use client";

import Link from 'next/link';
import React from 'react';
import { ArrowLeft, Save, Send } from 'lucide-react';
import {
    renderTemplateFormFromFields,
    type CompanyTemplateInputMode,
    type CompanyTemplateParticipant
} from '@/lib/electronic-contracts/company-template';
import { getApiAuthHeaders } from '@/utils/apiAuthHeaders';
import {
    fetchCompanyTemplateDetail,
    saveCompanyTemplateDraft,
    type CompanyTemplateDetail
} from './companyTemplatesClient';
import {
    detailFields,
    detailRoles,
    isRecord,
    recordStringMap,
    snapshotInputMode,
    snapshotParticipants,
    type ContractDetailResponse
} from './companyTemplateContractModel';
import { CompanyTemplateInputModeSelector } from './CompanyTemplateInputModeSelector';
import styles from './electronicContracts.module.css';

type Props = {
    readonly templateId: string;
    readonly draftId?: string;
};

type SendResponse = {
    readonly data?: {
        readonly contractId?: string;
        readonly ucansignDocumentId?: string;
    };
    readonly message?: string;
};

export function CompanyTemplateContractCreatePage({ templateId, draftId = '' }: Props) {
    const [detail, setDetail] = React.useState<CompanyTemplateDetail | null>(null);
    const [values, setValues] = React.useState<Record<string, string>>({});
    const [participants, setParticipants] = React.useState<Record<string, CompanyTemplateParticipant>>({});
    const [sending, setSending] = React.useState(false);
    const [savingDraft, setSavingDraft] = React.useState(false);
    const [draftContractId, setDraftContractId] = React.useState('');
    const [inputMode, setInputMode] = React.useState<CompanyTemplateInputMode>('erp');
    const [message, setMessage] = React.useState('');

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const requestedDraftId = draftId || params.get('draftId') || params.get('contractId') || '';
        fetchCompanyTemplateDetail(templateId, { source: 'ucansign' })
            .then(nextDetail => {
                setDetail(nextDetail);
                const initialValues = Object.fromEntries(
                    renderTemplateFormFromFields(detailFields(nextDetail)).map(field => [field.fieldKey, field.defaultValue || ''])
                );
                const initialParticipants = Object.fromEntries(
                    detailRoles(nextDetail).map(role => [role.roleKey, { roleKey: role.roleKey, name: '', contact: '' }])
                );
                setValues(initialValues);
                setParticipants(initialParticipants);
                if (requestedDraftId) {
                    setDraftContractId(requestedDraftId);
                    void loadDraft(requestedDraftId, initialValues, initialParticipants);
                }
            })
            .catch(caught => setMessage(caught instanceof Error ? caught.message : '템플릿을 불러오지 못했습니다.'));
    }, [draftId, templateId]);

    async function loadDraft(
        requestedDraftId: string,
        initialValues: Record<string, string>,
        initialParticipants: Record<string, CompanyTemplateParticipant>
    ) {
        try {
            const response = await fetch(`/api/electronic-contracts/${encodeURIComponent(requestedDraftId)}`, {
                cache: 'no-store',
                headers: await getApiAuthHeaders()
            });
            const payload: ContractDetailResponse = await response.json();
            if (!response.ok) throw new Error(payload.message || '저장된 초안을 불러오지 못했습니다.');
            const snapshot = payload.data?.formSnapshot;
            if (!isRecord(snapshot)) throw new Error('초안 형식이 올바르지 않습니다.');
            setValues({ ...initialValues, ...recordStringMap(snapshot.values) });
            setParticipants({ ...initialParticipants, ...snapshotParticipants(snapshot.participants) });
            setInputMode(snapshotInputMode(snapshot));
            setDraftContractId(payload.data?.contract?.id || requestedDraftId);
            setMessage('저장된 초안을 불러왔습니다.');
        } catch (caught) {
            setMessage(caught instanceof Error ? caught.message : '저장된 초안을 불러오지 못했습니다.');
        }
    }

    if (!detail) {
        return (
            <main className={styles.container}>
                <div className={styles.panel}>템플릿을 불러오는 중입니다.</div>
                {message && <div className={styles.error}>{message}</div>}
            </main>
        );
    }

    const currentDetail = detail;
    const version = currentDetail.latestVersion;
    const formFields = renderTemplateFormFromFields(detailFields(currentDetail));
    const roles = detailRoles(currentDetail);

    function updateParticipant(roleKey: string, patch: Partial<CompanyTemplateParticipant>) {
        setParticipants(previous => ({
            ...previous,
            [roleKey]: { ...(previous[roleKey] || { roleKey, name: '', contact: '' }), ...patch }
        }));
    }

    async function saveDraft() {
        if (!version) return;
        setSavingDraft(true);
        setMessage('');
        try {
            const payload = await saveCompanyTemplateDraft({
                templateId: currentDetail.template.id,
                versionId: version.id,
                contractId: draftContractId,
                inputMode,
                values: inputMode === 'erp' ? values : {},
                participants: Object.values(participants)
            });
            setDraftContractId(payload.contractId);
            setMessage('임시저장했습니다.');
        } catch (caught) {
            setMessage(caught instanceof Error ? caught.message : '임시저장에 실패했습니다.');
        } finally {
            setSavingDraft(false);
        }
    }

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!version) return;
        setSending(true);
        setMessage('');
        try {
            const response = await fetch('/api/electronic-contracts/send-company-template', {
                method: 'POST',
                headers: await getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    templateId: currentDetail.template.id,
                    versionId: version.id,
                    contractId: draftContractId,
                    inputMode,
                    values: inputMode === 'erp' ? values : {},
                    participants: Object.values(participants)
                })
            });
            const payload: SendResponse = await response.json();
            if (!response.ok) throw new Error(payload.message || '전자계약 발송에 실패했습니다.');
            setMessage('전자계약 발송이 완료되었습니다.');
        } catch (caught) {
            setMessage(caught instanceof Error ? caught.message : '전자계약 발송에 실패했습니다.');
        } finally {
            setSending(false);
        }
    }

    return (
        <main className={styles.container}>
            <section className={`${styles.panel} ${styles.header}`}>
                <div>
                    <h1 className={styles.title}>{currentDetail.template.name}</h1>
                </div>
                <Link className={styles.secondaryButton} href="/contracts/electronic">
                    <ArrowLeft size={16} />
                    템플릿 목록
                </Link>
            </section>
            {message && <div className={message.includes('완료') ? styles.success : styles.error}>{message}</div>}
            <form className={styles.companyTemplateForm} onSubmit={submit}>
                <CompanyTemplateInputModeSelector
                    value={inputMode}
                    fieldCount={formFields.length}
                    onChange={setInputMode}
                />
                <section className={styles.formSection}>
                    <h2 className={styles.sectionTitle}>
                        {inputMode === 'erp' ? 'ERP에서 직접 작성' : '템플릿에서 직접 작성'}
                    </h2>
                    {inputMode === 'template' ? (
                        <div className={styles.inlineNotice}>문서 안 입력칸은 유캔싸인 서명 화면에서 작성합니다. 이 화면에서는 서명자 정보만 입력합니다.</div>
                    ) : formFields.length > 0 ? (
                        <div className={styles.formGrid}>
                            {formFields.map(field => (
                                <label className={styles.field} key={field.fieldKey}>
                                    <span>{field.label}{field.required ? ' *' : ''}</span>
                                    <input
                                        type={field.inputType === 'checkbox' ? 'text' : field.inputType}
                                        value={values[field.fieldKey] || ''}
                                        onChange={event => setValues(previous => ({ ...previous, [field.fieldKey]: event.target.value }))}
                                        required={field.required}
                                    />
                                </label>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.inlineNotice}>ERP에서 미리 입력할 필드가 없습니다. 템플릿에서 직접 작성 방식을 사용해 주세요.</div>
                    )}
                </section>
                <section className={styles.formSection}>
                    <h2 className={styles.sectionTitle}>서명자 정보</h2>
                    <div className={styles.formGrid}>
                        {roles.map(role => (
                            <React.Fragment key={role.roleKey}>
                                <label className={styles.field}>
                                    <span>{role.label} 이름{role.required ? ' *' : ''}</span>
                                    <input value={participants[role.roleKey]?.name || ''} onChange={event => updateParticipant(role.roleKey, { name: event.target.value })} required={role.required} />
                                </label>
                                <label className={styles.field}>
                                    <span>{role.label} 연락처/이메일{role.required ? ' *' : ''}</span>
                                    <input value={participants[role.roleKey]?.contact || ''} onChange={event => updateParticipant(role.roleKey, { contact: event.target.value })} required={role.required} />
                                </label>
                            </React.Fragment>
                        ))}
                    </div>
                </section>
                <div className={styles.formFooter}>
                    <Link className={styles.secondaryButton} href="/contracts/electronic">취소</Link>
                    <button className={styles.secondaryButton} type="button" onClick={saveDraft} disabled={savingDraft || sending}>
                        <Save size={16} />
                        {savingDraft ? '저장 중' : '임시저장'}
                    </button>
                    <button className={styles.primaryButton} type="submit" disabled={sending || savingDraft || !version?.ucansign_template_id}>
                        <Send size={16} />
                        {sending ? '발송 중' : '전자계약 발송'}
                    </button>
                </div>
            </form>
        </main>
    );
}
