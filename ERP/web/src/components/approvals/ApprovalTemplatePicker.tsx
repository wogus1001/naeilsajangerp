import { ArrowRight, Check, FileText } from 'lucide-react';
import { approvalCategoryLabel } from './approvalLabels';
import type { ApprovalTemplate } from './approvalTypes';
import styles from './ApprovalDocument.module.css';

type ApprovalTemplatePickerProps = {
    readonly loading: boolean;
    readonly onContinue: () => void;
    readonly onSelect: (templateId: string) => void;
    readonly selectedId: string;
    readonly templates: readonly ApprovalTemplate[];
};

export function ApprovalTemplatePicker({ loading, onContinue, onSelect, selectedId, templates }: ApprovalTemplatePickerProps) {
    return (
        <section className={styles.templatePicker}>
            <div className={styles.pickerHeading}>
                <span>1단계</span>
                <div><h3>사용할 양식을 선택하세요</h3><p>작성하려는 업무와 가장 가까운 양식을 고르면 다음 단계에서 내용을 입력합니다.</p></div>
            </div>
            {loading && <p className={styles.pickerState}>양식을 불러오는 중입니다.</p>}
            {!loading && templates.length === 0 && (
                <p className={styles.pickerState}>사용 중인 양식이 없습니다. 양식 관리에서 양식 사용을 시작해 주세요.</p>
            )}
            <div className={styles.templateCardGrid}>
                {templates.map(template => {
                    const selected = template.id === selectedId;
                    return (
                        <button
                            aria-pressed={selected}
                            className={selected ? styles.selectedTemplateCard : undefined}
                            key={template.id}
                            onClick={() => onSelect(template.id)}
                            type="button"
                        >
                            <span className={styles.templateIcon}><FileText size={18} aria-hidden="true" /></span>
                            <span className={styles.templateCardContent}>
                                <small>{approvalCategoryLabel(template.category)}</small>
                                <strong>{template.name}</strong>
                                <span>{template.description || '양식 설명이 없습니다.'}</span>
                                <em>작성 항목 {template.fields.length}개</em>
                            </span>
                            {selected && <span className={styles.selectedMark}><Check size={15} aria-hidden="true" /></span>}
                        </button>
                    );
                })}
            </div>
            <div className={styles.pickerActions}>
                <button disabled={!selectedId} onClick={onContinue} type="button">선택한 양식으로 작성<ArrowRight size={17} aria-hidden="true" /></button>
            </div>
        </section>
    );
}
