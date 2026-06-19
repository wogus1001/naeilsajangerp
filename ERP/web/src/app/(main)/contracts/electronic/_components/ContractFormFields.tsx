"use client";

import React from 'react';
import styles from './electronicContracts.module.css';

type CommonFieldProps = {
    readonly label: string;
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly required?: boolean;
    readonly placeholder?: string;
    readonly suffix?: string;
};

type Option = {
    readonly value: string;
    readonly label: string;
};

export function FormSection({
    title,
    children
}: {
    readonly title: string;
    readonly children: React.ReactNode;
}) {
    return (
        <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            <div className={styles.formGrid}>{children}</div>
        </section>
    );
}

export function TextField({
    label,
    value,
    onChange,
    required,
    placeholder,
    suffix,
    type = 'text'
}: CommonFieldProps & { readonly type?: string }) {
    const input = (
        <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={event => onChange(event.target.value)}
            required={required}
        />
    );

    return (
        <label className={styles.field}>
            <span>{label}{required ? ' *' : ''}</span>
            {suffix ? <div className={styles.inputWithSuffix}>{input}<em>{suffix}</em></div> : input}
        </label>
    );
}

export function SelectField({
    label,
    value,
    onChange,
    required,
    options
}: CommonFieldProps & { readonly options: readonly Option[] }) {
    return (
        <label className={styles.field}>
            <span>{label}{required ? ' *' : ''}</span>
            <select value={value} onChange={event => onChange(event.target.value)} required={required}>
                {options.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        </label>
    );
}

export function TextAreaField({
    label,
    value,
    onChange,
    required,
    placeholder
}: CommonFieldProps) {
    return (
        <label className={`${styles.field} ${styles.wideField}`}>
            <span>{label}{required ? ' *' : ''}</span>
            <textarea value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} required={required} />
        </label>
    );
}
