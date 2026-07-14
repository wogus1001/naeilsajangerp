"use client";

import React from 'react';
import { useFranchiseIndustryOptions } from '@/components/franchise/useFranchiseIndustryOptions';
import { formatLeadPhoneInput } from '@/components/franchise/leads/leadFormFormatters';
import {
    FRANCHISE_LEAD_GRADES,
    FRANCHISE_LEAD_REGISTRATION_SOURCE,
    FRANCHISE_LEAD_SOURCES,
    FRANCHISE_LEAD_STATUSES,
    getFranchiseLeadGradeLabel,
    getFranchiseLeadSourceLabel,
    normalizeLeadStatus
} from '@/lib/franchise-leads';
import type { LeadRegistrationForm } from '@/lib/franchise-lead-registration';
import {
    buildMatchingRequestSections,
    type MatchingRequestField,
    type MatchingRequestFieldKey,
    type MatchingRequestForm
} from '@/lib/franchise-matching-request';
import type { WorkIntakeEditForm } from './requests';
import { PropertyWorkIntakeEditFields } from './PropertyWorkIntakeEditFields';
import styles from './WorkIntakeEditModal.module.css';

type WorkIntakeEditFieldsProps = {
    readonly form: WorkIntakeEditForm;
    readonly onChangeAction: (form: WorkIntakeEditForm) => void;
    readonly pendingPropertyFiles?: readonly File[];
    readonly onPendingPropertyFilesChangeAction?: (files: readonly File[]) => void;
};

function formatManwonInput(value: string): string {
    const digits = value.replace(/\D/g, '');
    return digits ? new Intl.NumberFormat('ko-KR').format(Number(digits)) : '';
}

function fieldClassName(field: MatchingRequestField): string {
    return field.full || field.wide ? styles.fullField : styles.field;
}

function renderMatchingField(
    field: MatchingRequestField,
    form: MatchingRequestForm,
    updateField: (key: MatchingRequestFieldKey, value: string | boolean) => void
) {
    const value = form[field.key];
    const label = <span>{field.label} {field.required && <b>*</b>}</span>;

    if (field.kind === 'checkbox') {
        return (
            <label className={styles.checkField} key={field.key}>
                <input type="checkbox" checked={Boolean(value)} onChange={event => updateField(field.key, event.target.checked)} />
                {label}
            </label>
        );
    }

    if (field.kind === 'select') {
        return (
            <label className={fieldClassName(field)} key={field.key}>
                {label}
                <select value={String(value)} onChange={event => updateField(field.key, event.target.value)} required={field.required}>
                    {(field.options || []).map(option => <option key={option || 'empty'} value={option}>{option || '선택'}</option>)}
                </select>
            </label>
        );
    }

    if (field.kind === 'textarea') {
        return (
            <label className={fieldClassName(field)} key={field.key}>
                {label}
                <textarea value={String(value)} onChange={event => updateField(field.key, event.target.value)} />
            </label>
        );
    }

    const input = (
        <input
            value={String(value)}
            type={field.kind === 'number' ? 'number' : field.kind}
            inputMode={field.kind === 'number' ? 'numeric' : undefined}
            onChange={event => updateField(field.key, event.target.value)}
            required={field.required}
        />
    );

    return (
        <label className={fieldClassName(field)} key={field.key}>
            {label}
            {field.unit ? <span className={styles.inputUnit}>{input}<em>{field.unit}</em></span> : input}
        </label>
    );
}

function LeadRegistrationEditFields({ value, onChange }: {
    readonly value: LeadRegistrationForm;
    readonly onChange: (value: LeadRegistrationForm) => void;
}) {
    return (
        <>
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>기본 정보</h3>
                <div className={styles.editGrid}>
                    <label className={styles.field}>가맹 희망자명 *<input value={value.name} onChange={event => onChange({ ...value, name: event.target.value })} required /></label>
                    <label className={styles.field}>연락처<input value={value.mobile} onChange={event => onChange({ ...value, mobile: formatLeadPhoneInput(event.target.value) })} /></label>
                    <label className={styles.field}>상태<select value={value.status} onChange={event => onChange({ ...value, status: normalizeLeadStatus(event.target.value) })}>{FRANCHISE_LEAD_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select></label>
                    <label className={styles.field}>등급<select value={value.grade} onChange={event => onChange({ ...value, grade: event.target.value })}><option value="">미지정</option>{FRANCHISE_LEAD_GRADES.map(grade => <option key={grade} value={grade}>{getFranchiseLeadGradeLabel(grade)}</option>)}</select></label>
                    <label className={styles.field}>유입경로<select value={value.source} onChange={event => onChange({ ...value, source: event.target.value })}><option value="">미지정</option>{FRANCHISE_LEAD_SOURCES.filter(source => source !== FRANCHISE_LEAD_REGISTRATION_SOURCE).map(source => <option key={source} value={source}>{getFranchiseLeadSourceLabel(source)}</option>)}</select></label>
                    <label className={styles.field}>희망지역<input value={value.desiredRegion} onChange={event => onChange({ ...value, desiredRegion: event.target.value })} /></label>
                </div>
            </section>
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>상담 조건</h3>
                <div className={styles.editGrid}>
                    <label className={styles.field}>예산 최소(만원)<input value={value.budgetMin} onChange={event => onChange({ ...value, budgetMin: formatManwonInput(event.target.value) })} /></label>
                    <label className={styles.field}>예산 최대(만원)<input value={value.budgetMax} onChange={event => onChange({ ...value, budgetMax: formatManwonInput(event.target.value) })} /></label>
                    <label className={styles.field}>관심브랜드<input value={value.interestedBrand} onChange={event => onChange({ ...value, interestedBrand: event.target.value })} /></label>
                    <label className={styles.field}>담당자<input value={value.managerId} onChange={event => onChange({ ...value, managerId: event.target.value })} /></label>
                    <label className={styles.field}>다음 연락일<input type="datetime-local" value={value.nextContactAt} onChange={event => onChange({ ...value, nextContactAt: event.target.value })} /></label>
                    <label className={styles.fullField}>메모<textarea value={value.memo} onChange={event => onChange({ ...value, memo: event.target.value })} /></label>
                </div>
            </section>
        </>
    );
}

function MatchingRequestEditFields({ value, onChange }: {
    readonly value: MatchingRequestForm;
    readonly onChange: (value: MatchingRequestForm) => void;
}) {
    const industryOptions = useFranchiseIndustryOptions();
    const sections = React.useMemo(() => buildMatchingRequestSections(industryOptions), [industryOptions]);
    const updateField = (key: MatchingRequestFieldKey, fieldValue: string | boolean) => onChange({ ...value, [key]: fieldValue });

    return (
        <>
            {sections
                .filter(section => section.id !== 'owned-property-detail' || value.ownedPropertyStatus === '보유')
                .map(section => (
                    <section className={styles.section} key={section.id}>
                        <h3 className={styles.sectionTitle}>{section.title}</h3>
                        <div className={styles.editGrid}>
                            {section.fields.map(field => renderMatchingField(field, value, updateField))}
                        </div>
                    </section>
                ))}
        </>
    );
}

export function WorkIntakeEditFields({
    form,
    onChangeAction,
    pendingPropertyFiles = [],
    onPendingPropertyFilesChangeAction
}: WorkIntakeEditFieldsProps) {
    if (form.kind === 'properties') {
        return (
            <PropertyWorkIntakeEditFields
                value={form.value}
                pendingFiles={pendingPropertyFiles}
                onChangeAction={value => onChangeAction({ kind: 'properties', value })}
                onPendingFilesChangeAction={onPendingPropertyFilesChangeAction}
            />
        );
    }
    if (form.kind === 'leadRegistrations') {
        return <LeadRegistrationEditFields value={form.value} onChange={value => onChangeAction({ kind: 'leadRegistrations', value })} />;
    }
    return <MatchingRequestEditFields value={form.value} onChange={value => onChangeAction({ kind: 'matchingRequests', value })} />;
}
