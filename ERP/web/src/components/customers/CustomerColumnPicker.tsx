'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Columns3, GripVertical } from 'lucide-react';
import {
    CUSTOMER_LIST_COLUMNS,
    CustomerColumnPreferences,
    CustomerListColumnKey,
    moveCustomerListColumn,
    reorderCustomerListColumns,
    toggleCustomerListColumn
} from './customerListTableConfig';
import styles from './CustomerColumnPicker.module.css';

type CustomerColumnPickerProps = {
    readonly preferences: CustomerColumnPreferences;
    readonly onChangeAction: (preferences: CustomerColumnPreferences) => void;
};

const columnByKey = new Map(CUSTOMER_LIST_COLUMNS.map(column => [column.key, column]));

export default function CustomerColumnPicker({
    preferences,
    onChangeAction
}: CustomerColumnPickerProps) {
    const [draggedColumn, setDraggedColumn] = useState<CustomerListColumnKey | null>(null);

    const handleDrop = (targetKey: CustomerListColumnKey) => {
        if (draggedColumn) {
            onChangeAction(reorderCustomerListColumns(preferences, draggedColumn, targetKey));
        }
        setDraggedColumn(null);
    };

    return (
        <details className={styles.picker}>
            <summary className={styles.summary}>
                <Columns3 size={16} aria-hidden="true" />
                표시 컬럼 {preferences.visible.length}개
            </summary>
            <div className={styles.panel}>
                <div className={styles.heading}>
                    <strong>컬럼 설정</strong>
                    <span>끌어서 순서를 바꿀 수 있습니다.</span>
                </div>
                <div className={styles.list}>
                    {preferences.order.map((key, index) => {
                        const column = columnByKey.get(key);
                        if (!column) return null;

                        return (
                            <div
                                key={key}
                                className={`${styles.row} ${draggedColumn === key ? styles.dragging : ''}`}
                                draggable
                                onDragStart={() => setDraggedColumn(key)}
                                onDragEnd={() => setDraggedColumn(null)}
                                onDragOver={event => event.preventDefault()}
                                onDrop={() => handleDrop(key)}
                            >
                                <GripVertical
                                    className={styles.grip}
                                    size={16}
                                    aria-label={`${column.label} 컬럼 이동`}
                                />
                                <label className={styles.label}>
                                    <input
                                        type="checkbox"
                                        checked={preferences.visible.includes(key)}
                                        disabled={column.required}
                                        onChange={() => onChangeAction(toggleCustomerListColumn(preferences, key))}
                                    />
                                    <span>{column.label}</span>
                                    {column.required && <small>필수</small>}
                                </label>
                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        disabled={index === 0}
                                        aria-label={`${column.label} 위로 이동`}
                                        onClick={() => onChangeAction(moveCustomerListColumn(preferences, key, 'up'))}
                                    >
                                        <ArrowUp size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={index === preferences.order.length - 1}
                                        aria-label={`${column.label} 아래로 이동`}
                                        onClick={() => onChangeAction(moveCustomerListColumn(preferences, key, 'down'))}
                                    >
                                        <ArrowDown size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </details>
    );
}
