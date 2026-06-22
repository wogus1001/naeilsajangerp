"use client";

import React from 'react';
import { Trash2 } from 'lucide-react';
import {
    COMPANY_TEMPLATE_FIELD_TYPES,
    type CompanyTemplateField,
    type CompanyTemplateRole
} from '@/lib/electronic-contracts/company-template';
import styles from './electronicContracts.module.css';

type Props = {
    readonly field: CompanyTemplateField;
    readonly roles: readonly CompanyTemplateRole[];
    readonly pageCount: number;
    readonly onUpdateField: (fieldKey: string, patch: Partial<CompanyTemplateField>) => void;
    readonly onUpdateFieldType: (fieldKey: string, value: string) => void;
    readonly onUpdateFieldPage: (fieldKey: string, value: number) => void;
    readonly onRemove: (fieldKey: string) => void;
};

export function TemplateFieldEditor({
    field,
    roles,
    pageCount,
    onUpdateField,
    onUpdateFieldType,
    onUpdateFieldPage,
    onRemove
}: Props) {
    return (
        <div className={styles.fieldEditor}>
            <input value={field.fieldKey} onChange={event => onUpdateField(field.fieldKey, { fieldKey: event.target.value })} />
            <input value={field.label} onChange={event => onUpdateField(field.fieldKey, { label: event.target.value })} />
            <select value={field.type} onChange={event => onUpdateFieldType(field.fieldKey, event.target.value)}>
                {COMPANY_TEMPLATE_FIELD_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <select value={field.roleKey} onChange={event => onUpdateField(field.fieldKey, { roleKey: event.target.value })}>
                <option value="">역할 없음</option>
                {roles.map(role => <option key={role.roleKey} value={role.roleKey}>{role.label}</option>)}
            </select>
            <label className={styles.fieldMini}>
                <span>페이지</span>
                <input aria-label="page" type="number" min={1} max={pageCount} value={field.page} onChange={event => onUpdateFieldPage(field.fieldKey, Number(event.target.value) || 1)} />
            </label>
            <label className={styles.checkField}>
                <input type="checkbox" checked={field.required} onChange={event => onUpdateField(field.fieldKey, { required: event.target.checked })} />
                필수 입력
            </label>
            <div className={styles.coordinateGrid}>
                <input aria-label="x" type="number" value={field.x} onChange={event => onUpdateField(field.fieldKey, { x: Number(event.target.value) || 0 })} />
                <input aria-label="y" type="number" value={field.y} onChange={event => onUpdateField(field.fieldKey, { y: Number(event.target.value) || 0 })} />
                <input aria-label="width" type="number" value={field.width} onChange={event => onUpdateField(field.fieldKey, { width: Number(event.target.value) || 4 })} />
                <input aria-label="height" type="number" value={field.height} onChange={event => onUpdateField(field.fieldKey, { height: Number(event.target.value) || 4 })} />
            </div>
            <button className={styles.weakButton} type="button" onClick={() => onRemove(field.fieldKey)}>
                <Trash2 size={14} />
                삭제
            </button>
        </div>
    );
}
