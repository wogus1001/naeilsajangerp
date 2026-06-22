"use client";

import React from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import {
    copyCompanyTemplate,
    createCompanyTemplate,
    deleteCompanyTemplate,
    fetchCompanyTemplates,
    restoreCompanyTemplate,
    startCompanyTemplateUcansignLink,
    type CompanyTemplateSummary
} from './companyTemplatesClient';
import { CommonContractTemplatesSection } from './CommonContractTemplatesSection';
import { CompanyTemplateTable } from './CompanyTemplateTable';
import styles from './electronicContracts.module.css';

function defaultTemplateName(): string {
    return `UCanSign 템플릿 ${new Date().toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit'
    })}`;
}

type TemplateNotice = {
    readonly kind: 'success' | 'error';
    readonly text: string;
};

export function CompanyContractTemplatesPanel() {
    const [templates, setTemplates] = React.useState<readonly CompanyTemplateSummary[]>([]);
    const [busy, setBusy] = React.useState(false);
    const [notice, setNotice] = React.useState<TemplateNotice | null>(null);
    const [pendingDelete, setPendingDelete] = React.useState<CompanyTemplateSummary | null>(null);

    const activeTemplates = React.useMemo(
        () => templates.filter(template => template.status !== 'archived'),
        [templates]
    );
    const archivedTemplates = React.useMemo(
        () => templates.filter(template => template.status === 'archived'),
        [templates]
    );

    async function loadTemplates() {
        const rows = await fetchCompanyTemplates();
        setTemplates(rows);
    }

    function clearNotice() {
        setNotice(null);
    }

    function showSuccess(text: string) {
        setNotice({ kind: 'success', text });
    }

    function showError(text: string) {
        setNotice({ kind: 'error', text });
    }

    React.useEffect(() => {
        loadTemplates().catch(caught => showError(caught instanceof Error ? caught.message : '템플릿 목록을 불러오지 못했습니다.'));
    }, []);

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('ucansignTemplate');
        if (!status) return;
        if (status === 'connected') {
            showSuccess('연결했습니다.');
        } else {
            showError('템플릿 연결을 완료하지 못했습니다.');
        }
        loadTemplates().catch(caught => showError(caught instanceof Error ? caught.message : '템플릿 정보를 갱신하지 못했습니다.'));
        window.history.replaceState(null, '', window.location.pathname);
    }, []);

    React.useEffect(() => {
        if (notice?.kind !== 'success') return undefined;
        const timeoutId = window.setTimeout(() => setNotice(null), 3000);
        return () => window.clearTimeout(timeoutId);
    }, [notice]);

    async function createTemplateAndOpenSetup() {
        setBusy(true);
        clearNotice();
        try {
            const result = await createCompanyTemplate(defaultTemplateName(), '');
            const link = await startCompanyTemplateUcansignLink({
                templateId: result.templateId,
                versionId: result.versionId
            });
            window.location.assign(link.url);
        } catch (caught) {
            showError(caught instanceof Error ? caught.message : '템플릿 설정을 시작하지 못했습니다.');
            setBusy(false);
        }
    }

    async function editTemplate(template: CompanyTemplateSummary) {
        if (!template.latestVersion) return;
        setBusy(true);
        clearNotice();
        try {
            const result = await startCompanyTemplateUcansignLink({
                templateId: template.id,
                versionId: template.latestVersion.id
            });
            window.location.assign(result.url);
        } catch (caught) {
            showError(caught instanceof Error ? caught.message : '템플릿 수정을 시작하지 못했습니다.');
            setBusy(false);
        }
    }

    async function copyTemplate(template: CompanyTemplateSummary) {
        setBusy(true);
        clearNotice();
        try {
            await copyCompanyTemplate(template.id);
            await loadTemplates();
            showSuccess('복사했습니다.');
        } catch (caught) {
            showError(caught instanceof Error ? caught.message : '템플릿 복사에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    }

    async function confirmDelete() {
        if (!pendingDelete) return;
        setBusy(true);
        clearNotice();
        try {
            const result = await deleteCompanyTemplate(pendingDelete.id);
            await loadTemplates();
            showSuccess(
                pendingDelete.status === 'archived'
                    ? '삭제했습니다.'
                    : result.archived
                        ? '보관했습니다.'
                        : '삭제했습니다.'
            );
            setPendingDelete(null);
        } catch (caught) {
            showError(caught instanceof Error ? caught.message : '템플릿 삭제에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    }

    async function restoreTemplate(template: CompanyTemplateSummary) {
        setBusy(true);
        clearNotice();
        try {
            const nextStatus = template.latestVersion?.ucansignTemplateId ? 'active' : 'draft';
            await restoreCompanyTemplate(template.id, nextStatus);
            await loadTemplates();
            showSuccess('복원했습니다.');
        } catch (caught) {
            showError(caught instanceof Error ? caught.message : '템플릿 복원에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={styles.templateLayout}>
            <section className={styles.panel}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>템플릿 관리</h2>
                    </div>
                    <button className={styles.primaryButton} type="button" onClick={createTemplateAndOpenSetup} disabled={busy}>
                        <ExternalLink size={16} />
                        템플릿 만들기
                    </button>
                </div>
            </section>

            {notice?.kind === 'success' && (
                <div className={styles.toastViewport} role="status" aria-live="polite">
                    <div className={styles.toast}>{notice.text}</div>
                </div>
            )}
            {notice?.kind === 'error' && <div className={styles.error}>{notice.text}</div>}

            <CommonContractTemplatesSection />

            <section className={styles.panel}>
                <h3 className={styles.templateSectionTitle}>회사 템플릿</h3>
                <CompanyTemplateTable
                    templates={activeTemplates}
                    emptyText="사용 중인 회사 템플릿이 없습니다."
                    busy={busy}
                    onEdit={editTemplate}
                    onCopy={copyTemplate}
                    onDelete={setPendingDelete}
                />
            </section>

            {archivedTemplates.length > 0 && (
                <section className={styles.panel}>
                    <h3 className={styles.templateSectionTitle}>보관 템플릿</h3>
                    <CompanyTemplateTable
                        templates={archivedTemplates}
                        emptyText="보관된 템플릿이 없습니다."
                        busy={busy}
                        archived
                        onEdit={editTemplate}
                        onDelete={setPendingDelete}
                        onRestore={restoreTemplate}
                    />
                </section>
            )}

            {pendingDelete && (
                <div className={styles.dialogBackdrop} role="presentation">
                    <section className={styles.systemDialog} role="dialog" aria-modal="true" aria-labelledby="delete-template-title">
                        <div className={styles.systemDialogIcon}><Trash2 size={20} /></div>
                        <h3 id="delete-template-title">{pendingDelete.status === 'archived' ? '보관 템플릿 삭제' : '템플릿 삭제'}</h3>
                        {pendingDelete.status === 'archived' ? (
                            <p>
                                <strong>{pendingDelete.name}</strong> 보관 템플릿을 완전히 삭제할까요?
                                삭제 후 템플릿 목록에서 사라집니다.
                            </p>
                        ) : (
                            <p>
                                <strong>{pendingDelete.name}</strong> 템플릿을 삭제할까요?
                                발송 이력이 있으면 보관 템플릿으로 이동합니다.
                            </p>
                        )}
                        <div className={styles.systemDialogActions}>
                            <button className={styles.secondaryButton} type="button" onClick={() => setPendingDelete(null)} disabled={busy}>취소</button>
                            <button className={styles.dangerButton} type="button" onClick={confirmDelete} disabled={busy}>삭제</button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
