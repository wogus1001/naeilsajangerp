'use client';

import React from 'react';
import { RotateCcw, Save } from 'lucide-react';
import type { SupervisionPayload } from './supervisionTypes';
import type { AssignmentFormState } from './SupervisionAssignmentTypes';
import { formatSupervisorOptionLabel, getDuplicateSupervisorNames } from './supervisorDisplay';
import styles from './SupervisionPanel.module.css';

export function AssignmentEditor(props: {
    readonly data: SupervisionPayload;
    readonly form: AssignmentFormState;
    readonly isEditing: boolean;
    readonly disabled: boolean;
    readonly onChange: (form: AssignmentFormState) => void;
    readonly onReset: () => void;
    readonly onSubmit: () => void;
}) {
    const duplicateSupervisorNames = React.useMemo(() => getDuplicateSupervisorNames(props.data.supervisors), [props.data.supervisors]);
    return (
        <div className={styles.assignmentEditor}>
            <div className={styles.assignmentEditorHeader}>
                <strong>{props.isEditing ? 'SV 배정 수정' : 'SV 신규 배정'}</strong>
                <span>{props.isEditing ? '선택한 운영점의 담당자를 변경합니다.' : '운영점별 활성 SV 1명을 배정합니다.'}</span>
            </div>
            <div className={styles.formGrid}>
                <SelectField label="운영점" value={props.form.locationId} disabled={props.isEditing} onChange={value => props.onChange({ ...props.form, locationId: value })}>
                    {props.data.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                </SelectField>
                <SelectField label="SV" value={props.form.supervisorProfileId} onChange={value => props.onChange({ ...props.form, supervisorProfileId: value })}>
                    {props.data.supervisors.map(supervisor => (
                        <option key={supervisor.id} value={supervisor.id}>
                            {formatSupervisorOptionLabel(supervisor, duplicateSupervisorNames)}
                        </option>
                    ))}
                </SelectField>
                <InputField label="담당 시작일" type="date" value={props.form.assignedAt} onChange={value => props.onChange({ ...props.form, assignedAt: value })} />
                <TextField label="담당 메모" value={props.form.memo} placeholder="권한, 인수인계 메모" onChange={value => props.onChange({ ...props.form, memo: value })} />
            </div>
            <div className={styles.buttonRow}>
                <button type="button" className={styles.secondaryButton} disabled={props.disabled} onClick={props.onReset}>
                    <RotateCcw size={13} /> 닫기
                </button>
                <button type="button" className={styles.primaryButton} disabled={props.disabled} onClick={props.onSubmit}>
                    <Save size={13} /> {props.isEditing ? '배정 수정 저장' : 'SV 배정 저장'}
                </button>
            </div>
        </div>
    );
}

function SelectField(props: {
    readonly label: string;
    readonly value: string;
    readonly disabled?: boolean;
    readonly children: React.ReactNode;
    readonly onChange: (value: string) => void;
}) {
    return (
        <div className={styles.field}>
            <label>{props.label}</label>
            <select value={props.value} disabled={props.disabled} onChange={event => props.onChange(event.currentTarget.value)}>
                {props.children}
            </select>
        </div>
    );
}

function InputField(props: {
    readonly label: string;
    readonly value: string;
    readonly type: string;
    readonly onChange: (value: string) => void;
}) {
    return (
        <div className={styles.field}>
            <label>{props.label}</label>
            <input type={props.type} value={props.value} onChange={event => props.onChange(event.currentTarget.value)} />
        </div>
    );
}

function TextField(props: {
    readonly label: string;
    readonly value: string;
    readonly placeholder: string;
    readonly onChange: (value: string) => void;
}) {
    return (
        <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>{props.label}</label>
            <textarea value={props.value} placeholder={props.placeholder} onChange={event => props.onChange(event.currentTarget.value)} />
        </div>
    );
}
