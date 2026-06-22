"use client";

import React from 'react';
import { Plus, Save } from 'lucide-react';
import {
    COMPANY_TEMPLATE_DEFAULT_ROLES,
    COMPANY_TEMPLATE_FIELD_TYPES,
    isCompanyTemplateFieldType,
    type CompanyTemplateField,
    type CompanyTemplateRole,
    type CompanyTemplateFieldType
} from '@/lib/electronic-contracts/company-template';
import {
    saveCompanyTemplateVersion,
    type CompanyTemplateDetail
} from './companyTemplatesClient';
import { TemplateFieldEditor } from './TemplateFieldEditor';
import { TemplateFieldOverlay } from './TemplateFieldOverlay';
import { TemplateRolesEditor } from './TemplateRolesEditor';
import {
    clampPage,
    createTemplateField,
    fieldFromDetail,
    pdfPreviewUrl,
    roleFromDetail,
    statusLabel
} from './templateBuilderModel';
import styles from './electronicContracts.module.css';

type Props = {
    readonly detail: CompanyTemplateDetail;
    readonly onSaved: () => Promise<void> | void;
};

export function CompanyTemplateBuilder({ detail, onSaved }: Props) {
    const version = detail.latestVersion;
    const [roles, setRoles] = React.useState<readonly CompanyTemplateRole[]>(COMPANY_TEMPLATE_DEFAULT_ROLES);
    const [fields, setFields] = React.useState<readonly CompanyTemplateField[]>([]);
    const [pageCount, setPageCount] = React.useState(1);
    const [selectedPage, setSelectedPage] = React.useState(1);
    const [ucansignTemplateId, setUcansignTemplateId] = React.useState('');
    const [selectedFieldKey, setSelectedFieldKey] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const visibleFields = React.useMemo(
        () => fields.filter(field => field.page === selectedPage),
        [fields, selectedPage]
    );

    React.useEffect(() => {
        setRoles(detail.roles.length > 0 ? detail.roles.map(roleFromDetail) : COMPANY_TEMPLATE_DEFAULT_ROLES);
        const nextFields = detail.fields.map(fieldFromDetail);
        const nextPageCount = version?.page_count || 1;
        setFields(nextFields);
        setSelectedFieldKey(nextFields[0]?.fieldKey || '');
        setPageCount(nextPageCount);
        setSelectedPage(clampPage(nextFields[0]?.page || 1, nextPageCount));
        setUcansignTemplateId(version?.ucansign_template_id || '');
        setMessage('');
    }, [detail, version]);

    function updateRole(roleKey: string, patch: Partial<CompanyTemplateRole>) {
        setRoles(previous => previous.map(role => role.roleKey === roleKey ? { ...role, ...patch } : role));
    }

    function updateField(fieldKey: string, patch: Partial<CompanyTemplateField>) {
        setFields(previous => previous.map(field => field.fieldKey === fieldKey ? { ...field, ...patch } : field));
    }

    function updatePageCount(value: number) {
        const nextPageCount = clampPage(value, 30);
        setPageCount(nextPageCount);
        setSelectedPage(previous => clampPage(previous, nextPageCount));
        setFields(previous => previous.map(field => ({
            ...field,
            page: clampPage(field.page, nextPageCount)
        })));
    }

    function updateFieldPage(fieldKey: string, value: number) {
        const page = clampPage(value, pageCount);
        updateField(fieldKey, { page });
        if (fieldKey === selectedFieldKey) setSelectedPage(page);
    }

    function removeField(fieldKey: string) {
        const nextFields = fields.filter(field => field.fieldKey !== fieldKey);
        setFields(nextFields);
        if (fieldKey === selectedFieldKey) {
            const nextSelected = nextFields[0];
            setSelectedFieldKey(nextSelected?.fieldKey || '');
            if (nextSelected) setSelectedPage(clampPage(nextSelected.page, pageCount));
        }
    }

    function addRole() {
        const next = roles.length + 1;
        setRoles(previous => [...previous, {
            roleKey: `role_${next}`,
            label: `서명자 ${next}`,
            signingOrder: next,
            required: true
        }]);
    }

    function addField(type: CompanyTemplateFieldType) {
        const next = createTemplateField(fields.length + 1, selectedPage);
        const field = { ...next, type, label: type === 'signature' ? '서명' : next.label };
        setFields(previous => [...previous, field]);
        setSelectedFieldKey(field.fieldKey);
    }

    function updateFieldType(fieldKey: string, value: string) {
        if (!isCompanyTemplateFieldType(value)) return;
        updateField(fieldKey, { type: value });
    }

    async function save() {
        if (!version) return;
        setSaving(true);
        setMessage('');
        try {
            await saveCompanyTemplateVersion({
                templateId: detail.template.id,
                versionId: version.id,
                pageCount,
                ucansignTemplateId,
                roles,
                fields
            });
            await onSaved();
            setMessage('템플릿 배치를 저장했습니다. 새로고침 후에도 유지됩니다.');
        } catch (caught) {
            setMessage(caught instanceof Error ? caught.message : '템플릿 저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className={styles.builderGrid}>
            <div className={styles.builderPreview}>
                <div className={styles.builderToolbar}>
                    <div>
                        <h3>{detail.template.name}</h3>
                        <span>{statusLabel(detail.template.status)} · {version?.source_file_name || 'PDF 미등록'}</span>
                    </div>
                    <button className={styles.primaryButton} type="button" onClick={save} disabled={!version || saving}>
                        <Save size={16} />
                        {saving ? '저장 중' : '배치 저장'}
                    </button>
                </div>
                <div className={styles.pdfStage}>
                    {version?.source_file_url ? (
                        <div className={styles.pdfPageSurface}>
                            <object key={selectedPage} className={styles.pdfObject} data={pdfPreviewUrl(version.source_file_url, selectedPage)} type="application/pdf">
                                PDF 미리보기를 불러오지 못했습니다.
                            </object>
                            <TemplateFieldOverlay
                                fields={visibleFields}
                                selectedFieldKey={selectedFieldKey}
                                onSelect={setSelectedFieldKey}
                                onUpdateField={updateField}
                            />
                        </div>
                    ) : (
                        <div className={styles.empty}>PDF를 업로드하면 이 영역에서 미리볼 수 있습니다.</div>
                    )}
                </div>
            </div>
            <aside className={styles.builderPanel}>
                <label className={styles.field}>
                    <span>페이지 수</span>
                    <input type="number" min={1} max={30} value={pageCount} onChange={event => updatePageCount(Number(event.target.value) || 1)} />
                </label>
                <label className={styles.field}>
                    <span>현재 배치 페이지</span>
                    <input type="number" min={1} max={pageCount} value={selectedPage} onChange={event => setSelectedPage(clampPage(Number(event.target.value) || 1, pageCount))} />
                </label>
                <label className={styles.field}>
                    <span>유캔싸인 템플릿 ID</span>
                    <input value={ucansignTemplateId} onChange={event => setUcansignTemplateId(event.target.value)} placeholder="하이브리드 발송 시 입력" />
                </label>
                <div className={styles.inlineActions}>
                    {COMPANY_TEMPLATE_FIELD_TYPES.map(type => (
                        <button key={type} className={styles.weakButton} type="button" onClick={() => addField(type)}>
                            <Plus size={14} />
                            {type}
                        </button>
                    ))}
                </div>
                <TemplateRolesEditor roles={roles} onAddRole={addRole} onUpdateRole={updateRole} />
                <div className={styles.builderList}>
                    <strong>필드</strong>
                    {fields.map(field => (
                        <TemplateFieldEditor
                            key={field.fieldKey}
                            field={field}
                            roles={roles}
                            pageCount={pageCount}
                            onUpdateField={updateField}
                            onUpdateFieldType={updateFieldType}
                            onUpdateFieldPage={updateFieldPage}
                            onRemove={removeField}
                        />
                    ))}
                </div>
                {message && <div className={message.includes('실패') ? styles.error : styles.success}>{message}</div>}
            </aside>
        </section>
    );
}
