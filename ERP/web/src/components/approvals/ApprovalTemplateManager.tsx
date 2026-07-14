'use client';

import React from 'react';
import { Archive, ArrowLeft, ArrowRight, Check, FilePlus2, Save, Send } from 'lucide-react';
import { AlertModal } from '@/components/common/AlertModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { createApprovalField } from './approvalFieldCatalog';
import { ApprovalFieldPalette } from './ApprovalFieldPalette';
import { fetchApprovalOrganization, fetchApprovalTemplates, saveApprovalTemplate, type SaveApprovalTemplateInput } from './approvalApi';
import { ApprovalPageHeader } from './ApprovalPageHeader';
import { ApprovalTemplateFieldEditor } from './ApprovalTemplateFieldEditor';
import { ApprovalTemplatePreview } from './ApprovalTemplatePreview';
import { ApprovalTemplateStepsEditor } from './ApprovalTemplateStepsEditor';
import { APPROVAL_TEMPLATE_CATEGORIES, approvalCategoryLabel } from './approvalLabels';
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
type TemplateStage = 1 | 2 | 3;
const EMPTY_ORGANIZATION: ApprovalOrganization = { canManageOrganization: false, requesterProfileId: '', people: [], units: [], memberships: [], roleAssignments: [], delegations: [] };
const TEMPLATE_STAGES = ['기본 정보', '문서 항목', '결재선 확인'] as const;

function createNewTemplate(): ApprovalTemplate {
    return {
        ...NEW_TEMPLATE,
        fields: [],
        steps: NEW_TEMPLATE.steps.map(step => ({ ...step, target: { ...step.target } }))
    };
}

export function ApprovalTemplateManager() {
    const [templates, setTemplates] = React.useState<readonly ApprovalTemplate[]>([]);
    const [active, setActive] = React.useState<ApprovalTemplate>(NEW_TEMPLATE);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [pendingCommand, setPendingCommand] = React.useState<SaveApprovalTemplateInput['command'] | null>(null);
    const [result, setResult] = React.useState<ResultModal | null>(null);
    const [organization, setOrganization] = React.useState<ApprovalOrganization>(EMPTY_ORGANIZATION);
    const [stage, setStage] = React.useState<TemplateStage>(1);

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

    function selectTemplate(template: ApprovalTemplate) {
        setActive(template);
        setStage(1);
    }

    function moveToNextStage() {
        if (stage === 1 && !active.name.trim()) {
            setResult({ message: '양식 이름을 입력해 주세요.', type: 'error' });
            return;
        }
        if (stage === 2 && active.fields.length === 0) {
            setResult({ message: '문서 항목을 한 개 이상 추가해 주세요.', type: 'error' });
            return;
        }
        if (stage < 3) setStage((stage + 1) as TemplateStage);
    }

    async function persist(command: SaveApprovalTemplateInput['command']) {
        if (!active.name.trim()) {
            setResult({ message: '양식 이름을 입력해 주세요.', type: 'error' });
            return;
        }
        if (command === 'publish' && active.fields.length === 0) {
            setResult({ message: '사용할 양식에는 문서 항목이 한 개 이상 필요합니다.', type: 'error' });
            return;
        }
        setSaving(true);
        try {
            const saved = await saveApprovalTemplate({ command, template: active });
            setActive(saved);
            setResult({
                message: command === 'publish' ? `${saved.version}번째 버전을 사용 시작했습니다.` : command === 'archive' ? '양식을 보관 처리했습니다.' : '양식 초안을 저장했습니다.',
                type: 'success'
            });
            await load();
        } catch (caught) {
            setResult({ message: caught instanceof Error ? caught.message : '양식을 저장하지 못했습니다.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    const commandLabel = pendingCommand === 'publish' ? '사용 시작' : '보관';
    return (
        <section className={styles.page}>
            <ApprovalPageHeader description="기본 정보, 문서 항목, 결재선을 순서대로 설정해 회사 양식을 만듭니다." title="양식 관리" />
            <div className={styles.managerGrid}>
                <aside className={styles.templateList}>
                    <button className={styles.newButton} onClick={() => selectTemplate(createNewTemplate())} type="button">
                        <FilePlus2 size={16} aria-hidden="true" />새 양식
                    </button>
                    <div className={styles.templateListHeader}><strong>양식 목록</strong><span>{templates.length}개</span></div>
                    {loading && <p>불러오는 중입니다.</p>}
                    {!loading && templates.length === 0 && <p>등록된 양식이 없습니다.</p>}
                    <div className={styles.templateItems}>
                        {templates.map(template => (
                            <button className={active.id === template.id ? styles.selected : undefined} key={template.id} onClick={() => selectTemplate(template)} type="button">
                                <strong>{template.name}</strong>
                                <span>{approvalCategoryLabel(template.category)} · {template.status === 'published' ? '사용 중' : template.status === 'archived' ? '보관' : '초안'}</span>
                            </button>
                        ))}
                    </div>
                </aside>
                <div className={styles.builderPanel}>
                    <div className={styles.builderHeader}>
                        <div><strong>{active.id ? `${active.version}번째 버전` : '새 양식'}</strong><span>{active.status === 'published' ? '사용 중' : active.status === 'archived' ? '보관됨' : '초안'}</span></div>
                        <div>
                            <button disabled={saving} onClick={() => void persist('save')} type="button"><Save size={15} />초안 저장</button>
                            {stage === 3 && <button className={styles.publishButton} disabled={saving} onClick={() => setPendingCommand('publish')} type="button"><Send size={15} />양식 사용 시작</button>}
                            {active.id && <button disabled={saving} onClick={() => setPendingCommand('archive')} type="button"><Archive size={15} />보관</button>}
                        </div>
                    </div>
                    <ol className={styles.stageNav} aria-label="양식 만들기 단계">
                        {TEMPLATE_STAGES.map((label, index) => (
                            <li className={stage === index + 1 ? styles.currentStage : stage > index + 1 ? styles.completeStage : undefined} key={label}>
                                <span>{stage > index + 1 ? <Check size={15} aria-label="완료" /> : index + 1}</span><strong>{label}</strong>
                            </li>
                        ))}
                    </ol>
                    {stage === 1 && (
                        <section className={styles.basicStage}>
                            <div><h3>양식 기본 정보</h3><p>작성자가 양식을 찾을 때 보이는 이름과 설명입니다.</p></div>
                            <div className={styles.templateMeta}>
                                <label><span>양식 이름</span><input onChange={event => setActive(current => ({ ...current, name: event.target.value }))} value={active.name} /></label>
                                <label><span>업무 분류</span><select onChange={event => setActive(current => ({ ...current, category: event.target.value }))} value={active.category}>{APPROVAL_TEMPLATE_CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
                                <label className={styles.metaDescription}><span>양식 설명</span><textarea onChange={event => setActive(current => ({ ...current, description: event.target.value }))} placeholder="작성자가 이 양식을 언제 사용하는지 짧게 안내해 주세요." rows={4} value={active.description} /></label>
                            </div>
                        </section>
                    )}
                    {stage === 2 && (
                        <div className={styles.builderGrid}>
                            <div className={styles.fieldBuilder}>
                                <section><h3>항목 추가</h3><ApprovalFieldPalette onAdd={addField} /></section>
                                <section className={styles.fieldEditorList}>
                                    <h3>문서 항목 <span>{active.fields.length}개</span></h3>
                                    {active.fields.length === 0 && <p className={styles.emptyFields}>위 항목을 선택해 문서 내용을 구성하세요.</p>}
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
                    )}
                    {stage === 3 && (
                        <div className={styles.reviewGrid}>
                            <ApprovalTemplateStepsEditor organization={organization} onChange={steps => setActive(current => ({ ...current, steps }))} steps={active.steps} />
                            <section className={styles.previewSection}><h3>최종 미리보기</h3><ApprovalTemplatePreview template={active} /></section>
                        </div>
                    )}
                    <div className={styles.stageActions}>
                        <button disabled={stage === 1} onClick={() => setStage((stage - 1) as TemplateStage)} type="button"><ArrowLeft size={16} />이전</button>
                        {stage < 3 && <button className={styles.nextButton} onClick={moveToNextStage} type="button">다음 단계<ArrowRight size={16} /></button>}
                    </div>
                </div>
            </div>
            <ConfirmModal
                confirmText={commandLabel}
                isDanger={pendingCommand === 'archive'}
                isOpen={pendingCommand !== null}
                message={pendingCommand === 'publish' ? '현재 내용으로 양식 사용을 시작할까요? 시작하면 작성자가 바로 선택할 수 있습니다.' : '이 양식을 작성 목록에서 내리고 보관할까요?'}
                onClose={() => setPendingCommand(null)}
                onConfirm={() => { if (pendingCommand) void persist(pendingCommand); }}
                title={`양식 ${commandLabel}`}
            />
            <AlertModal isOpen={result !== null} message={result?.message ?? ''} onClose={() => setResult(null)} title={result?.type === 'success' ? '저장 완료' : '저장 실패'} type={result?.type} />
        </section>
    );
}
