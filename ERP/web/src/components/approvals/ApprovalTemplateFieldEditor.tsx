import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { APPROVAL_FIELD_CATALOG } from './approvalFieldCatalog';
import type { ApprovalEditableRole, ApprovalField } from './approvalTypes';
import styles from './ApprovalTemplates.module.css';

type ApprovalTemplateFieldEditorProps = {
    readonly field: ApprovalField;
    readonly index: number;
    readonly total: number;
    readonly onChange: (field: ApprovalField) => void;
    readonly onMove: (direction: -1 | 1) => void;
    readonly onRemove: () => void;
};

const EDITABLE_ROLES: readonly { readonly value: ApprovalEditableRole; readonly label: string }[] = [
    { value: 'author', label: '기안자' },
    { value: 'all', label: '모든 처리자' }
] as const;

export function ApprovalTemplateFieldEditor({ field, index, total, onChange, onMove, onRemove }: ApprovalTemplateFieldEditorProps) {
    const supportsOptions = field.type === 'select' || field.type === 'checklist' || field.type === 'table';
    const typeLabel = APPROVAL_FIELD_CATALOG.find(item => item.type === field.type)?.label ?? field.type;
    return (
        <div className={styles.fieldEditor}>
            <div className={styles.fieldEditorHeader}>
                <span><b>{index + 1}</b><strong>{typeLabel}</strong></span>
                <div>
                    <button aria-label="위로 이동" disabled={index === 0} onClick={() => onMove(-1)} type="button"><ArrowUp size={15} /></button>
                    <button aria-label="아래로 이동" disabled={index === total - 1} onClick={() => onMove(1)} type="button"><ArrowDown size={15} /></button>
                    <button aria-label="필드 삭제" onClick={onRemove} type="button"><Trash2 size={15} /></button>
                </div>
            </div>
            <div className={styles.fieldEditorGrid}>
                <label><span>필드명</span><input onChange={event => onChange({ ...field, label: event.target.value })} value={field.label} /></label>
                <label><span>설명</span><input onChange={event => onChange({ ...field, description: event.target.value })} value={field.description ?? ''} /></label>
                <label>
                    <span>배치</span>
                    <select onChange={event => onChange({ ...field, columns: event.target.value === '2' ? 2 : 1 })} value={field.columns}>
                        <option value="1">한 줄 전체</option>
                        <option value="2">2열 절반</option>
                    </select>
                </label>
                <label>
                    <span>수정 권한</span>
                    <select onChange={event => {
                        const role = EDITABLE_ROLES.find(item => item.value === event.target.value)?.value ?? 'author';
                        onChange({ ...field, editableBy: role });
                    }} value={field.editableBy}>
                        {EDITABLE_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                </label>
                {supportsOptions && (
                    <label className={styles.optionsField}>
                        <span>{field.type === 'table' ? '열 이름' : '선택 항목'} (쉼표로 구분)</span>
                        <input
                            onChange={event => onChange({ ...field, options: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })}
                            value={(field.options ?? []).join(', ')}
                        />
                    </label>
                )}
                <label className={styles.checkboxField}>
                    <input checked={field.required} onChange={event => onChange({ ...field, required: event.target.checked })} type="checkbox" />
                    <span>필수 입력</span>
                </label>
            </div>
        </div>
    );
}
