import { Plus, Trash2 } from 'lucide-react';
import type { ApprovalFieldValue } from './approvalTypes';
import styles from './ApprovalDocument.module.css';

type ApprovalTableFieldProps = {
    readonly columns: readonly string[];
    readonly disabled: boolean;
    readonly value: ApprovalFieldValue | undefined;
    readonly onChange?: (value: ApprovalFieldValue) => void;
};

function tableRows(value: ApprovalFieldValue | undefined): readonly Readonly<Record<string, string>>[] {
    if (!Array.isArray(value)) return [];
    return value.filter(item => typeof item === 'object' && item !== null && !Array.isArray(item));
}

export function ApprovalTableField({ columns, disabled, value, onChange }: ApprovalTableFieldProps) {
    const headers = columns.length > 0 ? columns : ['항목', '내용'];
    const rows = tableRows(value);
    const visibleRows = rows.length > 0 ? rows : [{}];

    function updateCell(rowIndex: number, column: string, nextValue: string) {
        const nextRows = visibleRows.map((row, index) => index === rowIndex ? { ...row, [column]: nextValue } : row);
        onChange?.(nextRows);
    }

    return (
        <div className={styles.fieldTableWrap}>
            <table className={styles.fieldTable}>
                <thead><tr>{headers.map(header => <th key={header}>{header}</th>)}{!disabled && <th>삭제</th>}</tr></thead>
                <tbody>
                    {visibleRows.map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`}>
                            {headers.map(header => (
                                <td key={header}>
                                    <input
                                        aria-label={`${header} ${rowIndex + 1}행`}
                                        disabled={disabled}
                                        onChange={event => updateCell(rowIndex, header, event.target.value)}
                                        value={row[header] ?? ''}
                                    />
                                </td>
                            ))}
                            {!disabled && (
                                <td>
                                    <button
                                        aria-label={`${rowIndex + 1}행 삭제`}
                                        className={styles.iconButton}
                                        onClick={() => onChange?.(visibleRows.filter((_, index) => index !== rowIndex))}
                                        type="button"
                                    >
                                        <Trash2 size={15} aria-hidden="true" />
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            {!disabled && (
                <button
                    className={styles.addRowButton}
                    onClick={() => onChange?.([...visibleRows, {}])}
                    type="button"
                >
                    <Plus size={15} aria-hidden="true" /> 행 추가
                </button>
            )}
        </div>
    );
}
