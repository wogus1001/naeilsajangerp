'use client';

import React from 'react';
import { Archive, FilePlus2, Save, Send } from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { createApprovalField } from './approvalFieldCatalog';
import { ApprovalFieldPalette } from './ApprovalFieldPalette';
import { fetchApprovalOrganization, fetchApprovalTemplates, saveApprovalTemplate, type SaveApprovalTemplateInput } from './approvalApi';
import { ApprovalPageHeader } from './ApprovalPageHeader';
import { ApprovalTemplateFieldEditor } from './ApprovalTemplateFieldEditor';
import { ApprovalTemplatePreview } from './ApprovalTemplatePreview';
import { ApprovalTemplateStepsEditor } from './ApprovalTemplateStepsEditor';
import type { ApprovalField, ApprovalFieldType, ApprovalOrganization, ApprovalTemplate } from './approvalTypes';
import styles from './ApprovalTemplates.module.css';

const NEW_TEMPLATE: ApprovalTemplate = {
    id: '',
    name: '새 결재 양식',
    description: '',
    category: 'general',
    version: 0,
    status: 'draft',
    fields: [],
    steps: [{
        id: 'author-manager',
        label: '부서장 결재',
        action: 'approval',
        mode: 'sequential',
        target: { kind: 'author_manager' },
        targetLabel: '작성자 소속 부서장'
    }]
};

type ResultModal = { readonly message: string; readonly type: 'success' | 'error' };
const EMPTY_ORGANIZATION: ApprovalOrganization = { people: [], units: [], memberships: [], roleAssignments: [], delegations: [] };

export function ApprovalTemplateManager() {
    const [templates, setTemplates] = React.useState<readonly ApprovalTemplate[]>([]);
    const [active, setActive] = React.useState<ApprovalTemplate>(NEW_TEMPLATE);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [pendingCommand, setPendingCommand] = React.useState<SaveApprovalTemplateInput['command'] | null>(null);
    const [result, setResult] = React.useState<ResultModal | null>(null);
    const [organization, setOrganization] = React.useState<ApprovalOrganization>(EMPTY_ORGANIZATION);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const [data, organizationData] = await Promise.all([fetchApprovalTemplates(true), fetchApprovalOrganization()]);
            setTemplates(data);
            setOrganization(organizationData);
            setActive(current => data.find(template => template.id === current.id) ?? data[0] ?? NEW_TEMPLATE);
        } catch (caught) {
            setResult({ message: caught instanceof Error ? caught.message : '결재 양식을 불러오지 못했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { void load(); }, [load]);

    function updateField(index: number, field: ApprovalField) {
        setActive(current => ({ ...current, fields: current.fields.map((item, itemIndex) => itemIndex === index ? field : item) }));
    }

    function moveField(index: number, direction: -1 | 1) {
        setActive(current => {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= current.fields.length) return current;
            const fields = [...current.fields];
            const currentField = fields[index];
            const targetField = fields[nextIndex];
            if (!currentField || !targetField) return current;
            fields[index] = targetField;
            fields[nextIndex] = currentField;
            return { ...current, fields };
        });
    }

    function addField(type: ApprovalFieldType) {
        setActive(current => ({ ...current, fields: [...current.fields, createApprovalField(type)] }));
    }

    async function persist(command: SaveApprovalTemplateInput['command']) {
        if (!active.name.trim()) {
            setResult({ message: '양식 이름을 입력해 주세요.', type: 'error' });
            return;
        }
        if (command === 'publish' && active.fields.length === 0) {
            setResult({ message: '게시할 양식에는 필드가 한 개 이상 필요합니다.', type: 'error' });
            return;
        }
        setSaving(true);
        try {
            const saved = await saveApprovalTemplate({ command, template: active });
            setActive(saved);
            setResult({
                message: command === 'publish' ? `v${saved.version} 양식을 게시했습니다.` : command === 'archive' ? '양식을 보관 처리했습니다.' : '양식 초안을 저장했습니다.',
                type: 'success'
            });
            await load();
        } catch (caught) {
            setResult({ message: caught instanceof Error ? caught.message : '양식을 저장하지 못했습니다.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    const commandLabel = pendingCommand === 'publish' ? '게시' : '보관';
    return (
        <section className={styles.page}>
            <ApprovalPageHeader description="필드 구성과 결재선을 버전으로 관리하고 게시된 양식을 작성자에게 제공합니다." title="양식 관리" />
            <div className={styles.managerGrid}>
                <aside className={styles.templateList}>
                    <button className={styles.newButton} onClick={() => setActive({ ...NEW_TEMPLATE })} type="button">
                        <FilePlus2 size={16} aria-hidden="true" />새 양식
                    </button>
                    <div className={styles.templateListHeader}><strong>양식 목록</strong><span>{templates.length}개</span></div>
                    {loading && <p>불러오는 중입니다.</p>}
                    {!loading && templates.length === 0 && <p>등록된 양식이 없습니다.</p>}
                    <div className={styles.templateItems}>
                        {templates.map(template => (
                            <button className={active.id === template.id ? styles.selected : undefined} key={template.id} onClick={() => setActive(template)} type="button">
                                <strong>{template.name}</strong>
                                <span>v{template.version} · {template.status === 'published' ? '게시' : template.status === 'archived' ? '보관' : '초안'}</span>
                            </button>
                        ))}
                    </div>
                </aside>
                <div className={styles.builderPanel}>
                    <div className={styles.builderHeader}>
                        <div><strong>{active.id ? `v${active.version}` : '신규'}</strong><span>{active.status === 'published' ? '게시 중' : active.status === 'archived' ? '보관됨' : '초안'}</span></div>
                        <div>
                            <button disabled={saving} onClick={() => void persist('save')} type="button"><Save size={15} />초안 저장</button>
                            <button disabled={saving} onClick={() => setPendingCommand('publish')} type="button"><Send size={15} />버전 게시</button>
                            {active.id && <button disabled={saving} onClick={() => setPendingCommand('archive')} type="button"><Archive size={15} />보관</button>}
                        </div>
                    </div>
                    <div className={styles.templateMeta}>
                        <label><span>양식 이름</span><input onChange={event => setActive(current => ({ ...current, name: event.target.value }))} value={active.name} /></label>
                        <label><span>분류</span><input onChange={event => setActive(current => ({ ...current, category: event.target.value }))} value={active.category} /></label>
                        <label className={styles.metaDescription}><span>설명</span><input onChange={event => setActive(current => ({ ...current, description: event.target.value }))} value={active.description} /></label>
                    </div>
                    <div className={styles.builderGrid}>
                        <div className={styles.fieldBuilder}>
                            <section><h3>필드 추가</h3><ApprovalFieldPalette onAdd={addField} /></section>
                            <section className={styles.fieldEditorList}>
                                <h3>문서 필드 <span>{active.fields.length}개</span></h3>
                                {active.fields.length === 0 && <p className={styles.emptyFields}>왼쪽 블록을 선택해 문서 필드를 추가하세요.</p>}
                                {active.fields.map((field, index) => (
                                    <ApprovalTemplateFieldEditor
                                        field={field}
                                        index={index}
                                        key={field.id}
                                        onChange={next => updateField(index, next)}
                                        onMove={direction => moveField(index, direction)}
                                        onRemove={() => setActive(current => ({ ...current, fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index) }))}
                                        total={active.fields.length}
                                    />
                                ))}
                            </section>
                        </div>
                        <section className={styles.previewSection}><h3>A4 미리보기</h3><ApprovalTemplatePreview template={active} /></section>
                    </div>
                    <ApprovalTemplateStepsEditor organization={organization} onChange={steps => setActive(current => ({ ...current, steps }))} steps={active.steps} />
                </div>
            </div>
            <ConfirmModal
                confirmText={commandLabel}
                isDanger={pendingCommand === 'archive'}
                isOpen={pendingCommand !== null}
                message={pendingCommand === 'publish' ? '현재 필드 구성을 새 버전으로 게시할까요?' : '이 양식을 작성 목록에서 내리고 보관할까요?'}
                onClose={() => setPendingCommand(null)}
                onConfirm={() => { if (pendingCommand) void persist(pendingCommand); }}
                title={`양식 ${commandLabel}`}
            />
            <AlertModal isOpen={result !== null} message={result?.message ?? ''} onClose={() => setResult(null)} title={result?.type === 'success' ? '저장 완료' : '저장 실패'} type={result?.type} />
        </section>
    );
}
