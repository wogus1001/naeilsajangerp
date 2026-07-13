import type { ApprovalEditableRole, ApprovalField, ApprovalFieldValue, ApprovalFieldValues } from './approvalTypes';
import { ApprovalTableField } from './ApprovalTableField';
import styles from './ApprovalDocument.module.css';

type ApprovalFieldRendererProps = {
    readonly editable?: boolean;
    readonly fields: readonly ApprovalField[];
    readonly onChange?: (fieldId: string, value: ApprovalFieldValue) => void;
    readonly onAttachmentChange?: (files: readonly File[]) => void;
    readonly role?: ApprovalEditableRole;
    readonly values: ApprovalFieldValues;
};

function textValue(value: ApprovalFieldValue | undefined): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function stringList(value: ApprovalFieldValue | undefined): readonly string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : [];
}

function isStringRecord(value: ApprovalFieldValue | undefined): value is Readonly<Record<string, string>> {
    return typeof value === 'object'
        && value !== null
        && !Array.isArray(value)
        && Object.values(value).every(item => typeof item === 'string');
}

function valueRecord(value: ApprovalFieldValue | undefined): Readonly<Record<string, string>> {
    return isStringRecord(value) ? value : {};
}

function assertNever(value: never): never {
    throw new TypeError(`지원하지 않는 결재 필드입니다: ${JSON.stringify(value)}`);
}

export function ApprovalFieldRenderer({ editable = false, fields, onAttachmentChange, onChange, role = 'author', values }: ApprovalFieldRendererProps) {
    return (
        <div className={styles.fieldGrid}>
            {fields.map(field => {
                const value = values[field.id];
                const disabled = !editable || (field.editableBy !== 'all' && field.editableBy !== role);
                const fieldClass = `${styles.field} ${field.columns === 2 ? styles.fieldHalf : ''}`;
                const control = (() => {
                    switch (field.type) {
                        case 'shortText':
                            return <input disabled={disabled} onChange={event => onChange?.(field.id, event.target.value)} value={textValue(value)} />;
                        case 'longText':
                            return <textarea disabled={disabled} onChange={event => onChange?.(field.id, event.target.value)} rows={4} value={textValue(value)} />;
                        case 'number':
                        case 'money':
                            return <input disabled={disabled} inputMode="decimal" onChange={event => onChange?.(field.id, event.target.value)} type="number" value={textValue(value)} />;
                        case 'date':
                            return <input disabled={disabled} onChange={event => onChange?.(field.id, event.target.value)} type="date" value={textValue(value)} />;
                        case 'period': {
                            const period = valueRecord(value);
                            return (
                                <div className={styles.period}>
                                    <input aria-label={`${field.label} 시작일`} disabled={disabled} onChange={event => onChange?.(field.id, { ...period, start: event.target.value })} type="date" value={period.start ?? ''} />
                                    <span>~</span>
                                    <input aria-label={`${field.label} 종료일`} disabled={disabled} onChange={event => onChange?.(field.id, { ...period, end: event.target.value })} type="date" value={period.end ?? ''} />
                                </div>
                            );
                        }
                        case 'select':
                            return (
                                <select disabled={disabled} onChange={event => onChange?.(field.id, event.target.value)} value={textValue(value)}>
                                    <option value="">선택</option>
                                    {field.options?.map(option => <option key={option} value={option}>{option}</option>)}
                                </select>
                            );
                        case 'checklist': {
                            const selected = stringList(value);
                            return (
                                <div className={styles.checklist}>
                                    {field.options?.map(option => (
                                        <label key={option}>
                                            <input
                                                checked={selected.includes(option)}
                                                disabled={disabled}
                                                onChange={event => onChange?.(field.id, event.target.checked
                                                    ? [...selected, option]
                                                    : selected.filter(item => item !== option))}
                                                type="checkbox"
                                            />
                                            <span>{option}</span>
                                        </label>
                                    ))}
                                </div>
                            );
                        }
                        case 'table':
                            return <ApprovalTableField columns={field.options ?? []} disabled={disabled} onChange={next => onChange?.(field.id, next)} value={value} />;
                        case 'score':
                            return <input disabled={disabled} max="10" min="0" onChange={event => onChange?.(field.id, event.target.value)} type="number" value={textValue(value)} />;
                        case 'attachment':
                            return <input disabled={disabled} multiple onChange={event => {
                                const selectedFiles = Array.from(event.target.files ?? []);
                                onChange?.(field.id, selectedFiles.map(file => file.name));
                                onAttachmentChange?.(selectedFiles);
                            }} type="file" />;
                        case 'checkbox':
                            return (
                                <label className={styles.booleanField}>
                                    <input checked={value === true} disabled={disabled} onChange={event => onChange?.(field.id, event.target.checked)} type="checkbox" />
                                    <span>확인</span>
                                </label>
                            );
                        case 'person':
                            return <input disabled={disabled} onChange={event => onChange?.(field.id, event.target.value)} placeholder="이름을 입력하세요" value={textValue(value)} />;
                        case 'description':
                            return <p className={styles.descriptionBlock}>{field.description || '작성 안내를 확인해 주세요.'}</p>;
                        default:
                            return assertNever(field.type);
                    }
                })();
                return (
                    <div className={fieldClass} key={field.id}>
                        {field.type !== 'description' && (
                            <label>{field.label}{field.required && <span className={styles.required}>필수</span>}</label>
                        )}
                        {field.description && field.type !== 'description' && <p>{field.description}</p>}
                        {control}
                    </div>
                );
            })}
        </div>
    );
}
